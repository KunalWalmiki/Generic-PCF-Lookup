import CustomFramework, {
    EntityReference,
    IInputs,
    IOutputs,
  } from "../generated/CustomeTypes";

export interface AccountLookupModalProps {
    context: ComponentFramework.Context<IInputs>;
    notifyOutputChanged: () => void;
    value: EntityReference | null;
    onChange: (newValue: CustomFramework.EntityReference) => void;
    filterCriteria: string | undefined;
    disabled: boolean | undefined;
    entity : string ;
    requiredFields : string[] ;
    searchFields : string[] ,
    primaryAttributeName : string,
}
  
export interface fetchProps {
    name: string;
    city: string;
    s2kCustomer: string;
    s2kShipTo: string;
}
  
export type DynamicEntity<TFields = Record<string, any>> = TFields;

export interface DynamicField {
  fieldName: string;
  headerName: string;
  dataType : string;
}


export interface MetadataResult {
  attributes: Record<string, string>;
  entitySetName: string;
}

// lookup type
export interface LookupValue {
  name: string; // Name of the related record
  id: string; // GUID of the related record
  entityType: string; // Logical name of the related entity
}

// optionSet Type
export interface OptionSetValue {
  value: number; // Option set value
  label: string; // Option set display label
}


export type DynamicFieldValue =
  | string // String or Memo fields
  | number // Integer, Decimal, Double, BigInt, or Money fields
  | boolean // Boolean or Two Options fields
  | LookupValue // Lookup fields
  | OptionSetValue // OptionSet fields
  | Date; // DateTime fields


  export type DynamicFieldRecord = Record<string, DynamicFieldValue>;


  export interface ColumnDef<T> {
    accessorKey: keyof T; // Key of the data field
    header: string; // Column header
    cell: (info: { getValue: () => DynamicFieldValue }) => React.ReactNode; // Custom cell rendering logic
  }


  export type OptionsMap<T> = Record<string, { label: string; value: string | number }[]>;


