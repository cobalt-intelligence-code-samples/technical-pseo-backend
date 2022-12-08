import aws from 'aws-sdk';
import { SitemapIndexStream, SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import { tableName } from '.';
import * as fs from 'fs';
import * as zlib from 'zlib';

const documentClient = new aws.DynamoDB.DocumentClient({
    region: 'us-east-1'
});

(async () => {
    const records = await getRecords();

    console.log('records', records.length);
    const zipcodes = records.filter((value: any, index: any, self: any) => self.indexOf(value) === index);
    console.log('zipcodes', zipcodes[234], zipcodes[2555], zipcodes.length);

    let chunk: any[] = [];
    let sitemapsFilenames: string[] = [];
    for (let i = 0; i < zipcodes.length; i++) {
        const zipcodeData = zipcodes[i];
        chunk.push(zipcodeData);

        if (chunk.length >= 10000) {
            console.log('creating sitemap', i);
            // Create sitemap
            await createSitemap(chunk, i);
            sitemapsFilenames.push(`sitemap-${i}.xml`);
            chunk = [];
        }
    }
    console.log('creating final sitemap');
    // Create sitemap
    await createSitemap(chunk, 123456789);
    sitemapsFilenames.push(`sitemap-123456789.xml`);
    chunk = [];

    await createIndex(sitemapsFilenames);    
})();

// Scan through records
// Recurse if there is a lastEvaluatedKey
export async function getRecords(records: any[] = [], iteration = 0, lastEvaluatedKey?: aws.DynamoDB.DocumentClient.Key) {
    const scanParams: aws.DynamoDB.DocumentClient.QueryInput = {
        TableName: tableName
    };

    if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    console.log('scanParams', scanParams);
    const response = await documentClient.scan(scanParams).promise();

    records.push(...response.Items);

    if (response.LastEvaluatedKey) {
        iteration++;
        return await getRecords(records, iteration, response.LastEvaluatedKey);
    }

    return records;
}

async function createSitemap(zipcodes: any[], iteration: number) {
    const links: any[] = [];

    for (let i = 0; i < zipcodes.length; i++) {
        const zipcodeData = zipcodes[i];

        links.push({
            url: `/state/${zipcodeData.pk}/zipcode/${zipcodeData.zipcode.slice(0, -2)}`, changefreq: 'monthly', priority: 0.5
        });
    }

    const stream = new SitemapStream({ hostname: 'https://something.com' });

    // Return a promise that resolves with your XML string
    const data = await streamToPromise(Readable.from(links).pipe(stream));

    // console.log('data', data.toString());
    // fs.writeFileSync('/tmp/sitemap.xml', data.toString());

    fs.writeFileSync(`sitemap-${iteration}.xml`, data.toString());
}

async function createIndex(filenames: string[]) {
    console.log('filenames', filenames.length);
    const writeStream = fs.createWriteStream(`sitemap-index-${new Date().getTime()}.xml`);

    const smis = new SitemapIndexStream();
    const promises: any[] = [];
    for (const filename of filenames) {
        if (filename.includes('gz') && filename.includes('.xml.xml')) {
            continue;
        }
        console.log('file name', filename);
        const fileString = fs.readFileSync(filename);

        zlib.gzip(fileString.toString(), async (err, buffer) => {
            fs.writeFileSync(`sitemaps/${filename}.xml.gz`, buffer);
        });

        smis.write({ url: `https://example.com/sitemaps/${filename}.xml.gz` });
    };

    await Promise.all(promises);

    smis.pipe(writeStream);
    smis.end();
}