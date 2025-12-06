# TODO

## API & Infrastructure

- [ ] Fix browser access for npm app to call the google maps api key. it works as a standalone call but not from the local server.
- [ ] Set up aws backend processing. S3 tables integrated. Set up workflow that runs daily to ingest and process data.

### AWS Integration

#### Data Storage & Serving (S3 Tables)

- [ ] Create S3 table bucket (specialized bucket type for storing tables)
- [ ] Design table schema for transit data (Apache Iceberg format)
- [ ] Create S3 tables for transit data storage (instead of JSON files)
- [ ] Set up table bucket access policies and permissions
- [ ] Configure S3 Tables Intelligent-Tiering storage class for cost optimization
- [ ] Set up table bucket for multi-device access
- [ ] Configure table maintenance settings (compaction, snapshot management)
- [ ] Implement data retention policies for S3 tables
- [ ] Set up table versioning and snapshot management

#### Automated Data Fetching (Lambda + EventBridge)

- [ ] Create Lambda function to fetch transit data from Google Maps API
- [ ] Set up EventBridge schedule (e.g., every 5 minutes) to trigger Lambda
- [ ] Configure Lambda to write fetched data to S3 Tables (Apache Iceberg format)
- [ ] Implement data transformation to convert JSON responses to tabular format for S3 Tables
- [ ] Set up Lambda to handle table writes and updates
- [ ] Configure Lambda IAM role with S3 Tables write permissions
- [ ] Remove need for manual `fetch-transit-data.js` execution
- [ ] Set up error handling and retry logic in Lambda

#### Web App Hosting (S3 + CloudFront)

- [ ] Build React app for production
- [ ] Upload built app to S3 bucket
- [ ] Configure CloudFront distribution for S3 bucket
- [ ] Set up custom domain (optional)
- [ ] Enable HTTPS via CloudFront
- [ ] Configure caching policies

#### API Proxy (API Gateway + Lambda)

- [ ] Create Lambda function to proxy Google Maps API calls
- [ ] Expose Lambda via API Gateway
- [ ] Store Google Maps API key securely in AWS (not in client)
- [ ] Implement rate limiting in API Gateway
- [ ] Add caching layer for API responses
- [ ] Set up API Gateway authentication/authorization

#### Historical Data & Analytics (S3 Tables + AWS Glue + Athena)

- [ ] Design S3 Tables schema for historical transit times (Apache Iceberg)
- [ ] Create S3 tables for transit data with proper partitioning
- [ ] Set up AWS Glue Data Catalog integration for S3 Tables
- [ ] Register S3 Tables in Glue Data Catalog for querying
- [ ] Configure Amazon Athena to query S3 Tables
- [ ] Build SQL queries for delay tracking and pattern analysis using Athena
- [ ] Set up table partitioning strategy for efficient querying
- [ ] Create dashboards for transit trends over time using Athena results
- [ ] Configure table compaction and maintenance for optimal query performance
- [ ] Set up table snapshots for point-in-time queries

#### Notifications (SNS)

- [ ] Set up SNS topic for transit alerts
- [ ] Implement delay detection and alerting
- [ ] Create notification system for arriving buses/trains
- [ ] Configure email/SMS notification channels
- [ ] Set up user notification preferences

#### Monitoring & Observability (CloudWatch)

- [ ] Set up CloudWatch for API usage tracking
- [ ] Monitor Google Maps API costs
- [ ] Create CloudWatch dashboards for system health
- [ ] Set up alerts for data fetching failures
- [ ] Configure log aggregation and analysis
- [ ] Implement error tracking and alerting

#### AWS Setup & Configuration

- [ ] Set up AWS account and configure IAM roles
- [ ] Create IAM policies for Lambda, S3 Tables, Glue Data Catalog, Athena access
- [ ] Configure S3 Tables bucket policies and access controls
- [ ] Set up AWS Glue Data Catalog for table metadata management
- [ ] Configure VPC and security groups if needed
- [ ] Set up CloudFormation or Terraform for infrastructure as code (S3 Tables, Glue, Athena)
- [ ] Configure S3 Tables automatic maintenance (compaction, snapshot cleanup)
- [ ] Set up table backup and disaster recovery procedures
- [ ] Configure cost monitoring and budget alerts for S3 Tables usage
- [ ] Set up monitoring for table performance and query optimization

## User Profile & Authentication

- [ ] Add edit profile page and rails functionality; add profile pic (default pic for users)

## Stop Management

- [ ] Add the add stop functionality; user can designate city, transit type, origin, destination, check a stop for arrival time
- [ ] Allow user to edit placement of stop boxes
- [ ] Make stops movable around screen
- [ ] Add a refresh button that refreshes all stop information on the users page

## Transit Types

- [ ] Add flight transit type
- [ ] Add scooter and bike share info

## Transit Features

- [ ] Add countdown to each stop display
- [ ] Have api call on page refresh, or stop edit, or add stop
- [ ] Enable live tracking of bus and train; if enabled have an icon appear
- [ ] Have fare and gas and step count consumption estimates
- [ ] Have a "sync and compare" option that uses same destination for walk, bike, drive, and bus. Filtered by time lowest to highest
- [ ] Make each stop clickable that shows the directions on a map
- [ ] Setup somehow to track live time vs scheduled time. Feed to a model so buses can have a rating based on how often they are on schedule

## UI/UX Improvements

- [ ] Add a map interface to allow user to put origin and destination information in that way, and click on a transit stop by adding the transit layer
- [ ] Add option to change background image, text color, box color
- [ ] Add extra stop information: distance traveled, outside temperature

## Social & Discovery

- [ ] Add explore page; search other users, see their dashboards

## Analytics & Insights

- [ ] User dashboard able to log trips and show metrics
- [ ] What kind of insights can you get from tracking where people want to go? their popular/frequent travel times, preferred method of travel, whether they travel away from home often, how much they've spent on fares and gas, in app percentile use such as you are in the top 15% of bus patrons on the app, whether they should buy a certain type of transit pass

## AI & Automation

- [ ] Train a chatbot; start with precoded questions only
