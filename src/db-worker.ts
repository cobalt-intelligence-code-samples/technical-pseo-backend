import csvtojson from 'csvtojson';
import aws from 'aws-sdk';
import { tableName } from '.';

const documentClient = new aws.DynamoDB.DocumentClient({
    region: 'us-east-1'
});


// agi_stub is size of AGI
// 1 = under $25,000
// 2 = $25,000 to $49,999
// 3 = $50,000 to $74,999
// 4 = $75,000 to $99,999
// 5 = $100,000 to $199,999
// 6 = $200,000 or more
(async () => {
    const data = await csvtojson().fromFile('19zpallagi.csv');
    console.log('zipcodes', data.length);

    console.time('started');
    let promises: any[] = [];
    let pauseCount = 0;
    for (let i = 0; i < data.length; i++) {
    // for (let i = 0; i < 24; i++) {
        const zipcodeData = data[i];

        // console.log('zipcodeData', zipcodeData);

        // Data we want
        // STATE
        // zipcode
        // agi_stub
        // number of returns (N1)
        // salary amount (A00200)
        // dividends amount (A00600)
        const params: aws.DynamoDB.DocumentClient.PutItemInput = {
            TableName: tableName,
            Item: {
                pk: zipcodeData.STATE,
                zipcode: `${zipcodeData.zipcode}#${zipcodeData.agi_stub}`,                
                agiStub: zipcodeData.agi_stub,
                numberOfReturns: zipcodeData.N1,
                salaryAmount: zipcodeData.A00200,
                dividendsAmount: zipcodeData.A00600
            }
        };

        promises.push(documentClient.put(params).promise());

        if (i % 200 === 0) {
            await Promise.all(promises);
            promises = [];
            pauseCount++;
            console.log('pausing for current iteration', i, 'pauseCount', pauseCount);
        }
    }
    console.timeEnd('started');
})();