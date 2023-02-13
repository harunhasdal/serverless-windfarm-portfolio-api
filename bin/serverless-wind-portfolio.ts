#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ServerlessWindPortfolioStack } from "../lib/serverless-wind-portfolio-stack";

const app = new cdk.App();
new ServerlessWindPortfolioStack(app, "ServerlessWindPortfolioStack", {});
