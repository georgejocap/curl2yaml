export interface CurlParameter {
  id: string;
  name: string;
  value: any;
  inferredType: string;
  location: 'query' | 'header' | 'body';
  isMandatory: boolean;
  description?: string;
  exampleValue?: any;
}

export interface ParsedCurlData {
  method: string;
  fullUrl: string;
  basePath: string;
  queryParams: CurlParameter[];
  headers: CurlParameter[];
  body: any | null;
  bodyParams: CurlParameter[];
  contentType?: string;
  responses?: UserDefinedResponse[];
}

export interface OpenApiSchema {
  type: string | string[];
  format?: string;
  description?: string;
  example?: any;
  default?: any;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  enum?: any[];
  properties?: { [key: string]: OpenApiSchema };
  required?: string[];
  items?: OpenApiSchema | OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  not?: OpenApiSchema;
  [key: string]: any;
}

export interface OpenApiParameter {
  name: string;
  in: 'query' | 'header' | 'path';
  required: boolean;
  schema: OpenApiSchema;
  description?: string;
  example?: any;
}

export interface MediaTypeObject {
  schema?: OpenApiSchema;
  example?: any;
  examples?: { [exampleName: string]: any };
  encoding?: { [propertyName: string]: any };
}

export interface OpenApiRequestBody {
  required?: boolean;
  content: { [contentType: string]: MediaTypeObject };
  description?: string;
}

export interface OpenApiResponse {
  description: string;
  content?: { [contentType: string]: MediaTypeObject };
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody | any;
  responses: { [statusCode: string]: OpenApiResponse | any };
  tags?: string[];
}

export interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string; description?: string; variables?: any }[];
  paths: { [path: string]: { [method: string]: OpenApiOperation } };
  components?: {
    schemas?: { [key: string]: OpenApiSchema };
    securitySchemes?: { [key: string]: any };
  };
}

export interface UserDefinedResponse {
  id: string;
  statusCode: string;
  description: string;
  contentType: string;
  bodyExample: string;
}

export type AppMode = 'quick' | 'advanced';

export interface QuickConvertResult {
  yaml: string;
  details: string;
  title: string;
  method: string;
  path: string;
}
