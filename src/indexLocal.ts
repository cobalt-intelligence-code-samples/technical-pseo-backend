import { handler } from ".";


(async () => {
    const data = await handler({
        queryStringParameters: {
            state: 'CA'
        }
    });
    console.log('data', data);


})();