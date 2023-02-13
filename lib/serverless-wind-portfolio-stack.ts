import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { RemovalPolicy } from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

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

    const putIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: "PutItem",
      options: {
        credentialsRole: credentialsRole,
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
        integrationResponses: [
          {
            selectionPattern: "2\\d{2}",
            statusCode: "200",
            responseTemplates: {
              "application/json": `{
                "id": "$context.requestId"
              }`,
            },
          },
        ],
        requestTemplates: {
          "application/json": `{
              "Item": {
                "id": {
                  "S": "$context.requestId"
                },
                "name": {
                  "S": "$input.path('$.name')"
                },
                "number_of_turbines": {
                  "S": "$input.path('$.number_of_turbines')"
                }
              },
              "TableName": "${table.tableName}"
            }`,
        },
      },
    });

    const getCollectionIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: "Scan",
      options: {
        credentialsRole: credentialsRole,
        integrationResponses: [{ statusCode: "200" }],
        requestTemplates: {
          "application/json": `{
              "TableName": "${table.tableName}"
          }`,
        },
      },
    });

    const getIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: "GetItem",
      options: {
        credentialsRole: credentialsRole,
        integrationResponses: [{ statusCode: "200" }],
        requestTemplates: {
          "application/json": `{
              "Key": {
                "id": {
                  "S": "$method.request.path.id"
                }
              },
              "TableName": "${table.tableName}"
            }`,
        },
      },
    });

    const updateIntegration = new apigateway.AwsIntegration({
      service: "dynamodb",
      action: "PutItem",
      options: {
        credentialsRole: credentialsRole,
        integrationResponses: [{ statusCode: "200" }],
        requestTemplates: {
          "application/json": `{
              "Item": {
                "id": {
                  "S": "$method.request.path.id"
                },
                "name": {
                  "S": "$input.path('$.name')"
                },
                "number_of_turbines": {
                  "S": "$input.path('$.number_of_turbines')"
                }
              },
              "TableName": "${table.tableName}"
            }`,
        },
      },
    });

    farms.addMethod("POST", putIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });

    farms.addMethod("GET", getCollectionIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });

    const farm = farms.addResource("{id}");
    farm.addMethod("GET", getIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });
    farm.addMethod("PUT", updateIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });
  }
}

// interface CreateDynamoIntegrationProps {
//   action: string;
//   role: iam.Role;
//   requestTemplate: string;
//   integrationResponseTemplate?: string;
// }

// function createDynamoIntegration(
//   props: CreateDynamoIntegrationProps
// ): apigateway.AwsIntegration {
//   const integrationResponses = props.integrationResponseTemplate
//     ? [
//         {
//           statusCode: "200",
//           responseTemplates: {
//             "application/json": props.integrationResponseTemplate,
//           },
//         },
//       ]
//     : [{ statusCode: "200" }];

//   return new apigateway.AwsIntegration({
//     service: "dynamodb",
//     action: props.action,
//     options: {
//       credentialsRole: props.role,
//       integrationResponses,
//       requestTemplates: {
//         "application/json": props.requestTemplate,
//       },
//     },
//   });
// }
