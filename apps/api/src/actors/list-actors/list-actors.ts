import { APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { actors } from '../shared/actors-service';
import { randomErrors } from '../shared/random-errors';

const METHOD = 'list-actors.handler';

export const handler: APIGatewayProxyHandler = async (): Promise<APIGatewayProxyResult> => {
  try {
    const correlationId = uuid();

    console.log(`${correlationId} - ${METHOD} - started`);

    randomErrors(); // generate some random errors

    return {
      statusCode: 200,
      body: JSON.stringify(actors),
    };
  } catch (error: any) {
    console.error(`${METHOD} - error: ${JSON.stringify(error)}`);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify('An error as occurred', null, 2),
    };
  }
};
