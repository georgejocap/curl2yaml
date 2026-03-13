import yaml from 'js-yaml';
import type { CurlParameter, UserDefinedResponse } from '../types';

export const patchYaml = (
  rawYaml: string,
  params: CurlParameter[],
  responses: UserDefinedResponse[]
): string => {
  let spec: any;
  try {
    spec = yaml.load(rawYaml);
  } catch {
    return rawYaml; // If unparseable, return as-is
  }

  if (!spec || typeof spec !== 'object') return rawYaml;

  // Find first path + method in the spec
  const paths = spec.paths ?? {};
  const pathKey = Object.keys(paths)[0];
  if (!pathKey) return yaml.dump(spec, { lineWidth: -1 });

  const pathItem = paths[pathKey];
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
  const methodKey = Object.keys(pathItem).find((k) => httpMethods.includes(k.toLowerCase()));
  if (!methodKey) return yaml.dump(spec, { lineWidth: -1 });

  const operation = pathItem[methodKey];

  // ── 1. Patch header/query parameters required field ────────────────────────
  const headerAndQueryParams = params.filter(
    (p) => p.location === 'header' || p.location === 'query'
  );

  if (operation.parameters && Array.isArray(operation.parameters)) {
    operation.parameters = operation.parameters.map((opParam: any) => {
      const userParam = headerAndQueryParams.find(
        (p) => p.name.toLowerCase() === (opParam.name ?? '').toLowerCase()
      );
      if (userParam) {
        opParam.required = userParam.isMandatory;
      }
      return opParam;
    });
  }

  // ── 2. Patch body params required inside requestBody schema ────────────────
  const bodyParams = params.filter((p) => p.location === 'body' && p.name !== '$root');
  if (bodyParams.length > 0 && operation.requestBody?.content) {
    const contentKeys = Object.keys(operation.requestBody.content);
    for (const ck of contentKeys) {
      const schema = operation.requestBody.content[ck]?.schema;
      if (!schema) continue;

      const mandatoryTopLevel = bodyParams
        .filter((p) => !p.name.includes('.') && !p.name.includes('[]') && p.isMandatory)
        .map((p) => p.name);

      if (mandatoryTopLevel.length > 0) {
        if (!schema.required) schema.required = [];
        for (const fieldName of mandatoryTopLevel) {
          if (!schema.required.includes(fieldName)) {
            schema.required.push(fieldName);
          }
        }
      }

      // Remove previously-required fields that are now not mandatory
      if (schema.required) {
        schema.required = schema.required.filter((f: string) => {
          const found = bodyParams.find((p) => p.name === f);
          return found ? found.isMandatory : true; // keep if not in our params list
        });
        if (schema.required.length === 0) delete schema.required;
      }
    }
  }

  // ── 3. Merge user-defined responses ───────────────────────────────────────
  if (responses.length > 0) {
    if (!operation.responses) operation.responses = {};
    for (const res of responses) {
      if (!res.statusCode) continue;
      const responseObj: any = {
        description: res.description || res.statusCode,
      };
      if (res.bodyExample?.trim()) {
        try {
          const parsed = JSON.parse(res.bodyExample);
          responseObj.content = {
            'application/json': {
              example: parsed,
            },
          };
        } catch {
          // If not valid JSON, include as raw string
          responseObj.content = {
            'application/json': {
              example: res.bodyExample.trim(),
            },
          };
        }
      }
      operation.responses[res.statusCode] = responseObj;
    }
  }

  try {
    return yaml.dump(spec, { lineWidth: -1, noRefs: true });
  } catch {
    return rawYaml;
  }
};
