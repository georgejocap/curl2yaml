import type { ParsedCurlData, CurlParameter } from '../types';

const inferType = (value: any): string => {
  if (value === null || value === undefined) return 'null';
  const jsType = typeof value;
  if (jsType === 'boolean') return 'boolean';
  if (jsType === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  if (Array.isArray(value)) return 'array';
  if (jsType === 'object') return 'object';

  const strValue = String(value);
  if (strValue.toLowerCase() === 'true' || strValue.toLowerCase() === 'false') return 'boolean';
  if (strValue.trim() !== '' && !isNaN(Number(strValue)) && !/^\.$/.test(strValue.trim())) {
    return strValue.includes('.') ? 'number' : 'integer';
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[\+\-]\d{2}:\d{2})$/.test(strValue)) {
    return 'string:date-time';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) return 'string:date';
  return 'string';
};

const extractBodyParamsRecursively = (
  currentValue: any,
  currentPath: string,
  params: CurlParameter[]
): void => {
  const paramId = `body-${currentPath.replace(/\[\].$/g, '[].').replace(/\.$/, '')}`;

  if (currentValue === null || currentValue === undefined || typeof currentValue !== 'object') {
    params.push({
      id: paramId,
      name: currentPath,
      value: currentValue,
      exampleValue: currentValue,
      inferredType: inferType(currentValue),
      location: 'body',
      isMandatory: false,
    });
    return;
  }

  if (Array.isArray(currentValue)) {
    params.push({
      id: paramId,
      name: currentPath,
      value: currentValue,
      exampleValue: currentValue,
      inferredType: 'array',
      location: 'body',
      isMandatory: false,
    });
    if (currentValue.length > 0) {
      extractBodyParamsRecursively(currentValue[0], `${currentPath}[]`, params);
    }
  } else {
    Object.entries(currentValue).forEach(([key, value]) => {
      const newPath = currentPath
        ? currentPath.endsWith('[]')
          ? `${currentPath}.${key}`
          : `${currentPath}.${key}`
        : key;
      extractBodyParamsRecursively(value, newPath, params);
    });
  }
};

export const parseCurl = (curlCommand: string): ParsedCurlData => {
  const cleanedCommand = curlCommand.replace(/\\\n/g, ' ').trim();

  const result: ParsedCurlData = {
    method: 'GET',
    fullUrl: '',
    basePath: '',
    queryParams: [],
    headers: [],
    body: null,
    bodyParams: [],
    contentType: undefined,
    responses: [],
  };

  // Detect method
  const methodMatch =
    cleanedCommand.match(/-X\s+([A-Z]+)/i) ||
    cleanedCommand.match(/--request\s+([A-Z]+)/i);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase();
  } else if (
    cleanedCommand.includes('-d ') ||
    cleanedCommand.includes('--data') ||
    cleanedCommand.includes('--data-raw') ||
    cleanedCommand.includes('--data-binary')
  ) {
    result.method = 'POST';
  }

  // Extract URL
  const urlRegex =
    /(?:^|[\s])(?:curl\s*)?(?:['"]?)((?:https?:\/\/[^\s'"]+)|(?:(?:[a-zA-Z0-9_.-]*\.[a-zA-Z0-9_.-]+|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:[:\d]+)?(?:[/\?#][^\s'"']*)?))(?:['"]?)/;
  const urlMatch = cleanedCommand.match(urlRegex);

  if (!urlMatch?.[1]) {
    throw new Error(
      'Could not extract URL from cURL command. Please ensure the URL is valid (include http/https).'
    );
  }

  let rawUrl = urlMatch[1];
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = 'http://' + rawUrl;
  }
  result.fullUrl = rawUrl;

  try {
    const urlObject = new URL(result.fullUrl);
    result.basePath = urlObject.pathname;
    urlObject.searchParams.forEach((value, key) => {
      result.queryParams.push({
        id: `query-${key}`,
        name: key,
        value,
        exampleValue: value,
        inferredType: inferType(value),
        location: 'query',
        isMandatory: false,
      });
    });
  } catch (e: any) {
    throw new Error(`Invalid URL: '${result.fullUrl}'. ${e.message}`);
  }

  // Extract headers
  const headerRegex = /-H\s*(['"])(.*?)\1|--header\s*(['"])(.*?)\3/g;
  let match;
  while ((match = headerRegex.exec(cleanedCommand)) !== null) {
    const headerStr = match[2] || match[4];
    const colonIdx = headerStr.indexOf(':');
    if (colonIdx === -1) continue;
    const name = headerStr.substring(0, colonIdx).trim();
    const value = headerStr.substring(colonIdx + 1).trim();
    if (name && value) {
      result.headers.push({
        id: `header-${name.toLowerCase()}`,
        name,
        value,
        exampleValue: value,
        inferredType: 'string',
        location: 'header',
        isMandatory: false,
      });
      if (name.toLowerCase() === 'content-type') {
        result.contentType = value;
      }
    }
  }

  // Extract body
  const dataRegex =
    /(-d|--data|--data-binary|--data-raw|--data-urlencode)\s*(['"])([\s\S]*?)\2/;
  const dataMatch = dataRegex.exec(cleanedCommand);

  if (dataMatch?.[3]) {
    const bodyContent = dataMatch[3];
    const dataType = dataMatch[1];

    if (dataType === '--data-urlencode') {
      result.body = bodyContent;
      result.contentType = result.contentType || 'application/x-www-form-urlencoded';
      new URLSearchParams(bodyContent).forEach((val, key) => {
        result.bodyParams.push({
          id: `body-${key}`,
          name: key,
          value: val,
          exampleValue: val,
          inferredType: inferType(val),
          location: 'body',
          isMandatory: false,
        });
      });
    } else {
      try {
        if (
          (result.contentType && result.contentType.includes('application/json')) ||
          (bodyContent.startsWith('{') && bodyContent.endsWith('}')) ||
          (bodyContent.startsWith('[') && bodyContent.endsWith(']'))
        ) {
          const parsedJson = JSON.parse(bodyContent);
          result.body = parsedJson;
          result.contentType = result.contentType || 'application/json';

          if (typeof parsedJson === 'object' && parsedJson !== null) {
            extractBodyParamsRecursively(parsedJson, '', result.bodyParams);
          } else {
            result.bodyParams.push({
              id: 'body-$root',
              name: '$root',
              value: parsedJson,
              exampleValue: parsedJson,
              inferredType: inferType(parsedJson),
              location: 'body',
              isMandatory: false,
            });
          }
        } else {
          result.body = bodyContent;
          result.contentType = result.contentType || 'text/plain';
          result.bodyParams.push({
            id: 'body-$root',
            name: '$root',
            value: bodyContent,
            exampleValue: bodyContent,
            inferredType: 'string',
            location: 'body',
            isMandatory: false,
          });
        }
      } catch {
        result.body = bodyContent;
        result.contentType = result.contentType || 'text/plain';
        result.bodyParams.push({
          id: 'body-$root',
          name: '$root',
          value: bodyContent,
          exampleValue: bodyContent,
          inferredType: 'string',
          location: 'body',
          isMandatory: false,
        });
      }
    }
  }

  return result;
};
