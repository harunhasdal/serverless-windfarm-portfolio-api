import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as ServerlessWindPortfolio from "../lib/serverless-wind-portfolio-stack";

test("API Resources are created", () => {
  const app = new cdk.App();

  const stack = new ServerlessWindPortfolio.ServerlessWindPortfolioStack(
    app,
    "MyTestStack"
  );
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::ApiGateway::Resource", {
    PathPart: "farms",
  });
  template.hasResourceProperties("AWS::ApiGateway::Resource", {
    PathPart: "{id}",
  });
});
