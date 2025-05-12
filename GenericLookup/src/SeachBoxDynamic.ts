import React, { useEffect, useState } from "react";
import "../css/Modal.css";
import {
  fetchOptionsSet,
  fetchPrimaryColumnLabel,
} from "../utility/utilityFunctions";
import { OptionsMap } from "../types.ts/LookupTypes";

const metadataCache: Record<string, Field[]> = {}; // Cache storage

interface Field {
  name: string; // Attribute name
  label: string; // Input field label
  type: string; // Input field type (e.g., text, number, checkbox, etc.)
}

interface DynamicFormProps {
  entityName: string; // Entity logical name
  fieldNames: string[]; // Logical names of fields
  onSearch: (data: string, e: any) => void; // Callback for search logic
  search: Record<string, string>; // Form data managed by the parent
  primaryColumn: string;
  requiredFields: string[];
}

const fetchFieldMetadata = async (
  entityName: string,
  fieldNames: string[], // search fields
  requiredFields: string[] //table header column fields
): Promise<Field[]> => {
  // Generate a unique cache key based on entity name and required fields
  const cacheKey = `${entityName}-${fieldNames.join(",")}-${requiredFields.join(
    ","
  )}`;

  // Check if metadata is already in the cache
  if (metadataCache[cacheKey]) {
    console.log("Cache hit for:", cacheKey);
    return metadataCache[cacheKey]; // Return cached metadata
  }

  console.log("Cache miss for:", cacheKey);

  const clientUrl = (
    window as any
  ).Xrm.Utility.getGlobalContext().getClientUrl();
  const metadataUrl = `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes?$select=LogicalName,DisplayName,AttributeType`;

  const response = await fetch(metadataUrl, {
    headers: {
      "OData-Version": "4.0",
      Accept: "application/json",
    },
  });

  const metadata = await response.json();

  // check if table columns and search columns match there should be no search column which is not present in table
  fieldNames = fieldNames.filter((field) => requiredFields.includes(field));

  // Filter metadata to include only the requested fields
  const filteredMetadata = metadata.value.filter((attribute: any) =>
    fieldNames.includes(attribute.LogicalName)
  );

  // Map the filtered metadata to the Field interface
  const result = filteredMetadata.map((attribute: any) => ({
    name: attribute.LogicalName,
    label:
      attribute.DisplayName?.UserLocalizedLabel?.Label || attribute.LogicalName, // Fallback to LogicalName if DisplayName is unavailable
    type: mapAttributeTypeToInputType(attribute.AttributeType), // Map metadata types to HTML input types
  }));

  // Store the result in the cache
  metadataCache[cacheKey] = result;

  return result;
};

const mapAttributeTypeToInputType = (attributeType: string): string => {

  switch (attributeType) {
    case "String":
    case "Memo":
      return "text";

    case "Integer":
    case "BigInt":
    case "Decimal":
    case "Double":
    case "Money":
      return "number";

    case "DateTime":
      return "date";

    case "Boolean":
      return "TwoOptions";
    
    case "State":
      return "State"    

    case "Picklist":
      return "select"; // OptionSet maps to dropdown (select) input

    default:
      return "text";
  }
};

const MAX_FIELDS = 5;

const DynamicForm: React.FC<DynamicFormProps> = ({
  entityName,
  fieldNames,
  onSearch,
  search,
  primaryColumn,
  requiredFields,
}) => {
  const [fields, setFields] = useState<Field[]>([
    { name: primaryColumn, label: primaryColumn, type: "text" },
  ]);

  const [optionSetMap, setOptionSetMap] = useState<
    OptionsMap<{ label: string; value: number }>
  >({});

  useEffect(() => {
    const fetchFields = async () => {
      // For storing optionSet values if user provided search field is optionSet
      const fetchedOptions: any = {};

      // Fetching Fields based on privided search columns
      const dynamicFields = await fetchFieldMetadata(
        entityName,
        fieldNames,
        requiredFields
      ); // Fetch metadata dynamically

      // iterating on each field if type === Picklist than fetching its option to render
      for (const field of dynamicFields) {
        if (field.type === "select")
          fetchedOptions[field.name] = await fetchOptionsSet(
            entityName,
            field.name
          );
      }

      setOptionSetMap(fetchedOptions);

      const primaryColumnLabel = await fetchPrimaryColumnLabel(
        entityName,
        primaryColumn
      );

      setFields((prev) => [
        ...prev.map((field) => {
          if (field?.name === primaryColumn) {
            return { ...field, label: primaryColumnLabel };
          }
          return field;
        }),
        ...dynamicFields
          .filter((f) => f.name !== primaryColumn)
          .slice(0, MAX_FIELDS - 1),
      ]);
    };

    fetchFields();
  }, [entityName, fieldNames]);

  return (
    // React.createElement(
    //   "div",
    //   {className : "modal-search searchBarContainer"},
    //   fields.map((field) =>
    //     React.createElement(
    //       "div",
    //       { key: field.name },
    //       // React.createElement("label", { htmlFor: field.name }, field.label),
    //       // React.createElement(
    //       //   field.type === "select" || field.type === "TwoOptions" ? "select" : "input",
    //       //   {
    //       //     id: field.name,
    //       //     name: field.name,
    //       //     value:
    //       //       field.type === "select"
    //       //         ? search?.[field.name] || "" // Use empty string as default for Boolean
    //       //         : search?.[field.name] || "", // Value for Picklist or other fields
    //       //     onChange: (e : any) => onSearch(field.name, e.target.value),
    //       //     className: field.type === "select"? "lookup-input select" : "lookup-input",
    //       //     placeholder: field.type === "select" ? undefined : field?.label,
    //       //   },
    //       //   field.type === "select"
    //       //   ? optionSetMap[field?.name]?.length > 0
    //       //     ? React.createElement(
    //       //         React.Fragment,
    //       //         null,
    //       //         React.createElement("option", { key: "Select", value: "" }, `Select ${field.label}`),
    //       //         ...optionSetMap[field.name].map((option) => {
    //       //           return React.createElement("option", { key: option.value, value: option.value }, option.label)
    //       //         })
    //       //       )
    //       //     : React.createElement(
    //       //         React.Fragment,
    //       //         null,
    //       //         React.createElement("option", { key: "No Options", value: "" }, "No Options Available")
    //       //       )
    //       //   : field.type === "TwoOptions"
    //       //   ? React.createElement(
    //       //       React.Fragment,
    //       //       null,
    //       //       React.createElement("option", { key: "Select", value: "" }, `Select ${field.label}`),
    //       //       React.createElement("option", { key: "yes", value: "true" }, "Yes"),
    //       //       React.createElement("option", { key: "no", value: "false" }, "No")
    //       //     )
    //       //   : null
    //       // )
    //       React.createElement(
    //         field.type === "select" || field.type === "TwoOptions" ? "select" : "input",
    //         {
    //           id: field.name,
    //           name: field.name,
    //           value: search?.[field.name] || "", // Default value is an empty string
    //           onChange: (e: any) => onSearch(field.name, e.target.value),
    //           className: field.type === "select" ? "lookup-input select" : "lookup-input",
    //           placeholder: field.type === "select" ? undefined : field?.label,
    //         },
    //         field.type === "select"
    //           ? optionSetMap?.[field.name]?.length > 0

    //           ? ([
    //                 React.createElement("option", { key: "Select", value: "" }, `Select ${field.label}`),
    //                 ...optionSetMap[field.name].map((option) =>
    //                   (React.createElement("option", { key: option.value, value: option.value }, option.label))
    //                 ),
    //               ])

    //             : (React.createElement("option", { key: "NoOptions", value: "" }, "No Options Available"))

    //           : field.type === "TwoOptions"
    //           ? ([
    //               React.createElement("option", { key: "Select", value: "" }, `Select ${field.label}`),
    //               React.createElement("option", { key: "yes", value: "true" }, "Yes"),
    //               React.createElement("option", { key: "no", value: "false" }, "No"),
    //             ])
    //           : null
    //       )
    //     )
    //   )
    // )
    React.createElement(
      "div",
      { className: "modal-search searchBarContainer" },
      // Map through fields to dynamically render inputs/selects
      fields.map((field) => {

        if (!field || !field.type) {
          console.warn("Invalid field:", field);
          return null; // Skip invalid fields
        }

      return React.createElement(
          "div",
          { key: field.name }, // Ensure each field has a unique key
          React.createElement(
            field.type === "select" || field.type === "TwoOptions" || field.type === "State" ? "select" : "input", // Conditionally render `select` or `input`
            {
              id: field.name,
              name: field.name,
              value: search?.[field.name] || "", // Default value
              onChange: (e: any) => onSearch(field.name, e.target.value), // Handle changes
              className: field.type === "select" || field.type === "TwoOptions" ? "lookup-input select" : "lookup-input",
              placeholder: field.type === "text" ? field.label : "", // Placeholder for text fields
              type: field.type === "date" ? "date" : undefined, 
            },
            // Conditional rendering of children based on field type
            field.type === "select"
            ? ([
                React.createElement("option", { key: "Select", value: "" }, `Select ${field.label}`), // Default option
                ...(optionSetMap?.[field.name] || []).map((option) => {
                  console.log("inside options for rendering optionset");
                  console.log("option",option);
                  console.log(field.name);
                  return React.createElement("option", { key: option.value, value: option.value }, option.label)
                }
                 
                ),
              ])
            : field.type === "TwoOptions" 
            ? ([
                React.createElement("option", { key: "Select", value: "" }, `Select ${field.label}`), // Default option
                React.createElement("option", { key: "true", value: "true" }, "Yes"),
                React.createElement("option", { key: "false", value: "false" }, "No"),
              ])
            : field.type === "State" 
            ? ([
                React.createElement("option", { key: "Select", value: "" }, `Select ${field.label}`), // Default option
                React.createElement("option", { key: "0", value: "0" }, "Active"),
                React.createElement("option", { key: "1", value: "1" }, "InActive"),
              ])
            : null,  
          )
        )
      }
       )
      )
    )
};

export default DynamicForm;
