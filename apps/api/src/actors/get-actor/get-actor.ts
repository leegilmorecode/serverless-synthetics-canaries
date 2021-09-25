import { APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { actors } from '../shared/actors-service';
import { randomErrors } from '../shared/random-errors';
import { Actor } from '../shared/types';

const METHOD = 'get-actor.handler';

export const handler: APIGatewayProxyHandler = async ({ pathParameters: params }): Promise<APIGatewayProxyResult> => {
  try {
    const correlationId = uuid();
    console.log(`${correlationId} - ${METHOD} - started`);

    // this would typically have json schema validation around it
    const id = Number(params?.id);

    console.log(`${correlationId} - ${METHOD} - actor id ${id}`);

    randomErrors(); // generate some random errors

    const actor: Actor | undefined = actors.find((actor) => actor.id === id);

    if (!actor) {
      throw new Error(`Actor not found for id ${id}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(actor),
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
