import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { RemovalPolicy } from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  scanJSONRequestMapping,
  scanJSONResponseMapping,
  postJSONRequestMapping,
  postJSONResponseMapping,
  getItemJSONResponseMapping,
  getItemJSONRequestMapping,
  updateJSONRequestMapping,
} from "./windfarm-mapping-templates";

export class ServerlessWindPortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "windfarm", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: `id`,
        type: dynamodb.AttributeType.STRING,
      },
      tableName: "windfarm",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const logGroup = new logs.LogGroup(this, "WindFarmApiLogs", {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_WEEK,
    });

    const credentialsRole = new iam.Role(this, "WindFarmApiCredentialsRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    table.grantReadWriteData(credentialsRole);
    logGroup.grantWrite(credentialsRole);

    const api = new apigateway.RestApi(this, `WindFarmApi`, {
      restApiName: `WindFarm API`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
      },
      cloudWatchRole: true,
      deployOptions: {
        tracingEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        methodOptions: {
          "/*/*": {
            // This special path applies to all resource paths and all HTTP methods
            throttlingRateLimit: 5,
            throttlingBurstLimit: 10,
          },
        },
      },
    });

    const farms = api.root.addResource("farms");
    const farm = farms.addResource("{id}");

    farms.addMethod(
      "POST",
      new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "PutItem",
        options: {
          credentialsRole: credentialsRole,
          requestTemplates: {
            "application/json": postJSONRequestMapping(table.tableName),
          },
          passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": postJSONResponseMapping(),
              },
            },
          ],
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
      }
    );

    farms.addMethod(
      "GET",
      new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "Scan",
        options: {
          credentialsRole: credentialsRole,
          requestTemplates: {
            "application/json": scanJSONRequestMapping(table.tableName),
          },
          passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": scanJSONResponseMapping(),
              },
            },
          ],
        },
      }),
      {
        // authorizationType: apigateway.AuthorizationType.IAM,
        methodResponses: [{ statusCode: "200" }],
      }
    );

    farm.addMethod(
      "GET",
      new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "GetItem",
        options: {
          credentialsRole: credentialsRole,
          requestTemplates: {
            "application/json": getItemJSONRequestMapping(table.tableName),
          },
          passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": getItemJSONResponseMapping(),
              },
            },
          ],
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
      }
    );

    farm.addMethod(
      "PUT",
      new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "PutItem",
        options: {
          credentialsRole: credentialsRole,
          requestTemplates: {
            "application/json": updateJSONRequestMapping(table.tableName),
          },
          passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
          integrationResponses: [{ statusCode: "200" }],
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
      }
    );
  }
}
