import { ColumnDef } from "@tanstack/react-table";
import {
  DynamicField,
  DynamicFieldRecord,
} from "../types.ts/LookupTypes";

// Function accepts to parameter currencyCode , fields and returns columns to render data in react-table tanstack library
export const generateDynamicColumns = (
  currencyCode: string,
  fields: DynamicField[]
): ColumnDef<DynamicFieldRecord>[] => {

  return fields.map((field) => ({
    accessorKey: field.dataType === "Lookup" ? `_${field.fieldName}_value` : field.fieldName as keyof DynamicFieldRecord, // Maps the column to the field name
    header: field.headerName, // Uses the display name as the header
    cell: (info) => {
      const value = info?.getValue();
      console.log("Column Value:", info?.getValue());
      if (value === null || value === undefined) return "N/A"; // Safely handle null or undefined values

      // Handle specific CRM data types
      switch (field.dataType) {
        case "Picklist": {
          const formattedValueKey = `${field.fieldName}@OData.Community.Display.V1.FormattedValue`;
          const formattedValue = info.row.original[formattedValueKey];
          // if (formattedValue) {
            return formattedValue || "N/A"; // Return the formatted label if available
          // }
          break;
        }

        case "TwoOptions":
          // For Two Options, render "Yes" or "No"
          return value === true || value === 1 ? "Yes" : "No";
    

        case "DateTime":
          // For DateTime, format the date
          return new Date(value as Date).toLocaleDateString();
       


        case "Lookup": {
          // For Lookup, render the name or fallback to "N/A"
          // For Lookup, render the name or fallback to "N/A"
          const lookupFormattedValueKey = `_${field.fieldName}_value@OData.Community.Display.V1.FormattedValue`;
          const lookupFormattedValue = info.row.original[lookupFormattedValueKey];
          return lookupFormattedValue || "N/A";
   
        }

        case "Money": {
          // For Currency, format as monetary value
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currencyCode || "USD", // Replace with your preferred currency code
          }).format(value as number);
  
        }

        case "Integer":
        case "BigInt":
        case "Decimal":
        case "Double":
          // For numeric values, return formatted value
          return (value as number).toLocaleString();
      

        case "Boolean":
          // For Boolean, return "True" or "False"
          return value === true || value === 1 ? "Yes" : "No";
  

        default:
          // Default case for String, Memo, or unknown types
          return value.toString();
 
      }
    },
  }));
};

export const buildDynamicType = (fields:Record<string, string>) => {
  type DynamicType = typeof fields;
  return fields as DynamicType;
};

export const validateFields = (
  requestedFields: string[],
  metadata: Record<string, string>
): string[] => {
  const validFields = Object.keys(metadata);
  return requestedFields.filter((field) => validFields.includes(field));
};

export const fetchSelectedMetadata = async (
  entityName: string,
  requestedFields: string[]
): Promise<Record<string, {type : string, label : string}>> => {
  const clientUrl = (
    window as any
  ).Xrm.Utility.getGlobalContext().getClientUrl();

  const metadataUrl = `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes?$select=LogicalName,AttributeType,DisplayName`;

  const response = await fetch(metadataUrl, {
    headers: {
      "OData-Version": "4.0",
      Accept: "application/json",
    },
  });

  const metadata = await response.json();

  // Extract EntitySetName
  const entitySetName = metadata.EntitySetName;

  // Filter metadata for requested fields
  const filteredAttributes = metadata.value.filter((attribute: any) =>
    requestedFields.includes(attribute.LogicalName)
  );

  // Build a key-value pair for field name and type
  return filteredAttributes.reduce(
    (acc: Record<string, {type : string, label : string}>, field: any) => {
      acc[field.LogicalName] = {
       type : field?.AttributeType,
       label : field?.DisplayName?.UserLocalizedLabel?.Label || field?.LogicalName
      };
      return acc;
    },
    {}
  );
};

export const fetchEntityPluralName = async (entityName: string) => {
  const clientUrl = (
    window as any
  ).Xrm.Utility.getGlobalContext().getClientUrl();
  const metadataUrl = `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=EntitySetName`;
  const response = await fetch(metadataUrl, {
    headers: {
      "OData-Version": "4.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch metadata for entity '${entityName}'. HTTP status: ${response.status}`
    );
  }

  const metadata = await response.json();
  const entitySetName = metadata.EntitySetName; // Extract the EntitySetName
  console.log("EntitySetName:", entitySetName);
  return entitySetName;
};

export const fetchPrimaryColumn = async (
  entityName: string
): Promise<string> => {
  const clientUrl = (
    window as any
  ).Xrm.Utility.getGlobalContext().getClientUrl();
  const metadataUrl = `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=PrimaryNameAttribute`;

  const response = await fetch(metadataUrl, {
    headers: {
      "OData-Version": "4.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch metadata for entity getting primary attribute'${entityName}'. HTTP status: ${response.status}`
    );
  }

  const metadata = await response.json();
  return metadata.PrimaryNameAttribute; // This is the primary column name
};

export const fetchPrimaryIdField = async (
  entityName: string
): Promise<string> => {
  const clientUrl = (
    window as any
  ).Xrm.Utility.getGlobalContext().getClientUrl();
  const metadataUrl = `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=PrimaryIdAttribute`;

  const response = await fetch(metadataUrl, {
    headers: {
      "OData-Version": "4.0",
      Accept: "application/json",
    },
  });

  const metadata = await response.json();
  return metadata.PrimaryIdAttribute; // e.g., 'accountid' for Account, 'contactid' for Contact
};

// export const buildFilterQuery = (
//   searchFields: string[], // Comma-separated field names
//   searchValues: Record<string, string>, // Object with values for each field
//   additionalCriteria: string // Additional filter criteria (e.g., statecode, etc.)
// ): string => {
//   //Early Return if object is empty
//   if (Object.entries(searchValues).length === 0) {
//     return "";
//   }

//   const filterParts: string[] = []; // Array to store filter conditions

//   // Split the searchFields string into an array of field names
//   const fieldNames = searchFields.map((field) => field.trim());

//   // Iterate through each field and add a filter condition if a value exists
//   fieldNames.forEach((field) => {
//     const value = searchValues[field]; // Get the value for the field
//     if (value && value.length > 0) {
//       filterParts.push(`contains(${field},'${value}')`); // Dynamically add filter
//     }
//   });

//   // Add additional criteria, if any
//   if (additionalCriteria) {
//     filterParts.push(additionalCriteria);
//   }

//   // Combine all conditions with 'and'
//   return filterParts.length > 0 ? `&$filter=${filterParts.join(" and ")}` : "";
// };

// export const buildFilterQuery = (
//   searchFields: string[], // List of field names
//   searchValues: Record<string, string>, // Object with values for each field
//   additionalCriteria: string, // Additional filter criteria
//   fieldMeta: Record<string, {type : string, label : string}> // Metadata for field types
// ): string => {
//   // Early Return if the object is empty
//   if (Object.entries(searchValues).length === 0) {
//     return "";
//   }

//   const filterParts: string[] = []; // Array to store filter conditions

//   // Process each field
//   searchFields.forEach((field) => {
//     const value = searchValues[field]; // Get the user-supplied search value
//     if (value && value.length > 0) {
//       const fieldType = fieldMeta[field]?.type; // Get the field's data type

//       switch (fieldType) {
//         case "Lookup": {
//           // For lookups, search by name (formatted value) if possible
//           const lookupFormattedKey = `_${field}_value@OData.Community.Display.V1.FormattedValue`;
//           filterParts.push(`contains(${lookupFormattedKey},'${value.replace(/'/g, "''")}')`);
//           break;
//         }

//         case "Boolean": {
//           // For TwoOptionSet (Boolean), search with the exact match (e.g., 1 for true, 0 for false)
//           const booleanValue = value.toLowerCase() === "yes" || value.toLowerCase() === "true" ? "true" : "false";
//           filterParts.push(`${field} eq ${booleanValue}`);
//           break;
//         }

//         case "Picklist":
//         case "OptionSet": {
//           // For OptionSets, search by exact match with the option's value
//           filterParts.push(`${field} eq ${value}`);
//           break;
//         }

//         case "String":
//         case "Memo": {
//           // For text fields, use the contains function for partial matching
//           filterParts.push(`contains(${field},'${value}')`);
//           break;
//         }

//         case "DateTime": {
//           // For DateTime, handle equality or range (if needed)
//           filterParts.push(`${field} eq ${value}`);
//           break;
//         }

//         default: {
//           // Default case for other field types
//           filterParts.push(`contains(${field},'${value}')`);
//           break;
//         }
//       }
//     }
//   });

//   // Add additional criteria, if any
//   if (additionalCriteria) {
//     filterParts.push(additionalCriteria);
//   }

//   // Combine all conditions with 'and'
//   return filterParts.length > 0 ? `&$filter=${filterParts.join(" and ")}` : "";
// };

export const buildFilterQuery = async(
  entity : string,
  searchFields: string[], // List of field names
  searchValues: Record<string, string>, // Object with values for each field
  additionalCriteria: string, // Additional filter criteria
  fieldMeta: Record<string, { type: string; label: string }> // Metadata for field types
): Promise<{ filter: string; expand: string }> => {

  // Early return if the object is empty
  if (Object.entries(searchValues).length === 0) {
    return { filter: "", expand: "" };
  }

  const filterParts: string[] = []; // Array to store filter conditions
  const expandParts: string[] = ["owninguser($select=fullname,systemuserid)"]; // Array to store expand conditions

  // Process each field
  for (const field of searchFields) {
    const value = searchValues[field]; // Get the user-supplied search value
  
    if (value && value.length > 0) {
      const fieldType = fieldMeta[field]?.type; // Get the field's data type
  
      switch (fieldType) {
        case "Lookup": {
          // Fetch the logical name of the lookup field referencing the related entity
          const referencedEntityName = await FetchReferencedEntityName(entity, field);
  
          // Fetch the primary attribute name to search by name in lookup
          const primaryAttributeName = await fetchPrimaryColumn(referencedEntityName);

          const schemaName = await fetchSchemaNameOfEntity(entity, field);
  
          // For lookup fields, search by related entity's field (e.g., fullname)
          const relatedEntity = field; // The related entity logical name (e.g., pcf_contact)
          const relatedField = primaryAttributeName || ""; // Default to 'fullname' if no label is specified
  
          // Add filter for the related entity's field
          filterParts.push(
            `contains(${schemaName || ""}/${relatedField || ""}, '${value.replace(/'/g, "''")}')`
          );
  
          // Add expand for the lookup field
          // expandParts.push(`${relatedEntity}($select=${relatedField})`);
  
          break;
        }
        case "Boolean": {
          // For TwoOptionSet (Boolean), search with exact match
          const booleanValue =
            value.toLowerCase() === "yes" || value.toLowerCase() === "true" ? "true" : "false";
          filterParts.push(`${field} eq ${booleanValue}`);
          break;
        }
        case "Picklist":
        case "OptionSet": 
        case "State" :
        {
          // For OptionSets, search by exact match with the option's value
          filterParts.push(`${field} eq ${value}`);
          break;
        }
        case "String":
        case "Memo": {
          // For text fields, use the contains function for partial matching
          filterParts.push(`contains(${field},'${value.replace(/'/g, "''")}')`);
          break;
        }
        case "DateTime": {
          // For DateTime, handle equality or range (if needed)
            // Convert DateTime to Date format (YYYY-MM-DD)
          const formattedValue = new Date(value).toISOString().split("T")[0]; // Extract only the date part
          filterParts.push(`Microsoft.Dynamics.CRM.On(PropertyName='${field}',PropertyValue='${formattedValue}')`);
          break;

        }
        default: {
          // Default case for other field types
          filterParts.push(`contains(${field},'${value.replace(/'/g, "''")}')`);
          break;
        }
      }
    }
  }
  

  // Add additional criteria, if any
  if (additionalCriteria) {
    filterParts.push(additionalCriteria);
  }

  // Combine all conditions with 'and'
  const filterString = filterParts.length > 0 ? `&$filter=${filterParts.join(" and ")}` : "";
  const expandString = expandParts.length > 0 ? `&$expand=${expandParts.join(",")}` : "";

  return { filter: filterString, expand: expandString };
};

export const sanitizeRequiredFields = (
  requiredFields: Record<string, {type : string, label : string}>
): Record<string, string> => {
  const sanitizedFields: Record<string, string> = {};

  // Iterate over the keys and values in the input object
  Object.entries(requiredFields).forEach(([key, value]) => {
    // Sanitize the value (split, trim, remove empty fields)
    const sanitizedValue = key
      .split(",") // Split by commas
      .map((field) => field.trim()) // Trim spaces around each field name
      .filter((field) => field !== "") // Remove empty fields
      .join(","); // Join back into a sanitized comma-separated string

    // Assign the sanitized value to the new object
    sanitizedFields[key] = sanitizedValue;
  });

  return sanitizedFields;
};

export const getUniqueFields = (fields: string | undefined): string[] => {
  if (!fields) {
    return [];
  }

  // Split fields by comma, trim whitespace, and filter duplicates
  const uniqueFields = Array.from(
    new Set(
      fields.split(",").map((field) => field.trim().toLowerCase()) // Split and trim spaces
    )
  );

  return uniqueFields;
};

export const fetchDefaultCurrencyCode = async () => {
  try {
    const clientUrl = (
      window as any
    ).Xrm.Utility.getGlobalContext().getClientUrl();
    const baseCurrencyId = await getOrgCurrencyId();
    const metadataUrl = `${clientUrl}/api/data/v9.0/transactioncurrencies(${baseCurrencyId})?$select=currencyname,isocurrencycode`;

    const response = await fetch(metadataUrl, {
      headers: {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
    const data = await response.json();
    return data["isocurrencycode"]; // returning defaulkt currency code E.g., "USD"
  } catch (e) {
    console.log("Error While Fetching Base Currecy of Organization", e);
  }
};

export const getOrgCurrencyId = async () => {
  try {
    const clientUrl = (
      window as any
    ).Xrm.Utility.getGlobalContext().getClientUrl();
    const metadataUrl = `${clientUrl}/api/data/v9.0/organizations?$select=basecurrencyid`;

    const response = await fetch(metadataUrl, {
      headers: {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
    const data = await response.json();
    return data.value[0]._basecurrencyid_value; // return basecurrencyid
  } catch (e) {
    console.log("Error While fetching base currency Id", e);
  }
};

export const buildSelectQuery = (
  requiredFields: string[],
  fieldMeta: Record<string, {type : string, label : string}>
): string => {
  return requiredFields
    .map((field : any) => {
      // if (
      //   fieldMeta[field] === "Picklist" ||
      //   fieldMeta[field] === "StatusCode"
      // ) {
      //   return `${field},${field}@OData.Community.Display.V1.FormattedValue`;
      // }
      if (fieldMeta[field].type === "Lookup") {
        return `_${field}_value`;
      }

      return field; // Include all other fields without annotations
    })
    .join(",");
};

export const FetchReferencedEntityName = async (entityName: string, lookupField: string): Promise<string> => {

  try {

    const clientUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl();
    const url = `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes(LogicalName='${lookupField}')`;
  
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json();
    return data.Targets[0]; // Returns logical name of the referenced entity

  } catch(e) {
    console.log("Failed while fetching referenced entity name of lookup",e);
    return "";

  }

 

};

export const fetchSchemaNameOfEntity = async(entity : string, lookupField : string) => {

  try {

    const clientUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl();
    const url = `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entity}')/Attributes(LogicalName='${lookupField}')?$select=SchemaName`;
  
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json();
    return data.SchemaName; // Returns logical name of the referenced entity

  } catch(e) {
    console.log("Error While fteching entity schema name",e);
  }
} 

export const fetchPrimaryColumnLabel = async(entity : string, primaryColumnName : string) => {

  try {

    const clientUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl();
    const url = `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entity}')/Attributes(LogicalName='${primaryColumnName}')?$select=DisplayName`;
  
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json();
    return data?.DisplayName?.UserLocalizedLabel?.Label || ""; // Returns logical name of the referenced entity

  } catch(e) {
    console.log("Error While fteching entity Primary Column Label", e);
  }

}

export const fetchOptionsSet = async (entity : string, field : string) : Promise<{label : string, value : string}[]> => {

  try {

    const clientUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl();

    const response = await fetch(
      `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entity}')/Attributes(LogicalName='${field}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet`,
      { headers: { "OData-MaxVersion": "4.0", "OData-Version": "4.0", "Accept": "application/json" } }
    );
  
    const data = await response.json();
  
    return data?.OptionSet?.Options?.map((option : any) => ({
      label: option.Label.LocalizedLabels[0].Label,
      value: option.Value
    }));

  } catch(e) {
    console.log("Error while fetching optionSet Options", e);
    return [];

  }
  

};

export const fetchEntityDisplayName = async(entity : string)  => {

  try {

    const clientUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl();

    const response = await fetch(
      `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entity}')?$select=DisplayName`,
      { headers: { "OData-MaxVersion": "4.0", "OData-Version": "4.0", "Accept": "application/json" } }
    );
  
    const data = await response.json();

    console.log()
    return data.DisplayName.LocalizedLabels[0].Label || "";

  } catch(e) {

    console.log("Error While fetching entity display Name");
    return "";

  }
}



