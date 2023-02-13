export const postJSONResponseMapping = (): string => {
  return `{"id": "$context.requestId"}`;
};

export const postJSONRequestMapping = (tableName: string): string => {
  return `{
        "Item": {
          "id": {
            "S": "$context.requestId"
          },
          "name": {
            "S": "$input.path('$.name')"
          },
          "number_of_turbines": {
            "S": "$input.path('$.number_of_turbines')"
          }
        },
        "TableName": "${tableName}"
      }`;
};

export const scanJSONResponseMapping = (): string => {
  return `#set($inputRoot = $input.path('$'))
    {
        "farms": [
            #foreach($elem in $inputRoot.Items) {
                "id": "$elem.id.S",
                "name": "$elem.name.S",
                "number_of_turbines": "$elem.number_of_turbines.S"
            }#if($foreach.hasNext),#end
      #end
        ]
    }`;
};

export const scanJSONRequestMapping = (tableName: string): string => {
  return `{"TableName": "${tableName}"}`;
};

export const getItemJSONRequestMapping = (tableName: string): string => {
  return `{
    "Key": {
      "id": {
        "S": "$method.request.path.id"
      }
    },
    "TableName": "${tableName}"
  }`;
};

export const getItemJSONResponseMapping = (): string => {
  return `#set($inputRoot = $input.path('$.Item'))
    {
      "id": "$inputRoot.id.S",
      "name": "$inputRoot.name.S",
      "number_of_turbines": "$inputRoot.number_of_turbines.S"
    }`;
};

export const updateJSONRequestMapping = (tableName: string): string => {
  return `{
        "Item": {
          "id": {
            "S": "$method.request.path.id"
          },
          "name": {
            "S": "$input.path('$.name')"
          },
          "number_of_turbines": {
            "S": "$input.path('$.number_of_turbines')"
          }
        },
        "TableName": "${tableName}"
      }`;
};
