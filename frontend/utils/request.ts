import superagent, { Response } from 'superagent';
import prefix from 'superagent-prefix';
import { v4 as uuidv4 } from 'uuid';

import { IErrorInfo } from '@/types';


const baseURL = process.env.NEXT_PUBLIC_SIMPLEKANBAN_API_URL || '/api';

export const parseErrorResponse = (
  response: any,
  fields: string[],
): IErrorInfo => {
  const error: IErrorInfo = {};

  if (!!response) {
    // Check for error detail in API response
    if (typeof response.detail === 'string') {
      error['detail'] = [{ id: uuidv4(), msg: response.detail }];
    }

    // Check for non-field errors in API response
    if (
      Array.isArray(response.non_field_errors) &&
      response.non_field_errors.every((msg: any) => typeof msg === 'string')
    ) {
      error['nonField'] =
        response.non_field_errors.map((msg: string) => ({ id: uuidv4(), msg }));
    }

    // Check for field errors in API response
    fields.forEach(field => {
      if (
        Array.isArray(response[field]) &&
        response[field].every((msg: any) => typeof msg === 'string')
      ) {
        error[field] =
          response[field].map((msg: string) => ({ id: uuidv4(), msg }));
      }
    });        
  }

  return error;
};

export type { Response };

export const request =
  superagent
    .agent()
    .use(prefix(baseURL))
    .set({ 'Content-Type': 'application/json' });