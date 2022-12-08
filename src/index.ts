import aws from 'aws-sdk';

const documentClient = new aws.DynamoDB.DocumentClient({
    region: 'us-east-1'
});

export const tableName = 'agi-by-zipcode-pseo-example';

// API will go here
export async function handler(event) {
    console.log('event', event);
    const state = event?.queryStringParameters?.state;
    const zipcode = event?.queryStringParameters?.zipcode;

    if (!state) {
        console.log('received query without state. returning 400');
        
        // TODO: add stuff for CORS
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*', // Required for CORS support to work
                'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS 
            },
            body: 'Missing state'
        };
    }

    let keyConditionExpression = 'pk = :pk';
    if (zipcode) {
        keyConditionExpression += ' and begins_with(zipcode, :zipcode)';
    }
    let expressionAttributeValues = {
        ':pk': state
    };
    if (zipcode) {
        expressionAttributeValues[':zipcode'] = zipcode;
    }

    const queryParams: aws.DynamoDB.DocumentClient.QueryInput = {
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues
    };

    const data = await documentClient.query(queryParams).promise();
    console.log('Data found for state', state, 'zipcode', zipcode, 'data', data.LastEvaluatedKey, data.Count, data.ScannedCount);

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*', // Required for CORS support to work
            'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS 
        },
        body: JSON.stringify(data.Items)
    };
}