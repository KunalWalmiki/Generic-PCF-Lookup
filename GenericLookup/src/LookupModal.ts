import * as React from "react";
import { useState, useEffect, useRef } from "react";
import Modal from "react-modal";
import {AccountLookupModalProps, DynamicEntity, DynamicField, fetchProps} from "../types.ts/LookupTypes";
import {generateDynamicColumns, buildDynamicType, validateFields, fetchSelectedMetadata, fetchPrimaryIdField, buildFilterQuery, fetchEntityPluralName, sanitizeRequiredFields, fetchPrimaryColumn, buildSelectQuery, fetchDefaultCurrencyCode, fetchPrimaryColumnLabel, fetchEntityDisplayName} from "../utility/utilityFunctions"
import "../css/Modal.css";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  HeaderGroup,
  Row,
  Cell,
} from "@tanstack/react-table";
import _ from "lodash";
import DynamicForm from "./SeachBoxDynamic";
import { DndContext } from "@dnd-kit/core";


const AccountLookupModal = (props: AccountLookupModalProps) => {

  const [inputValue, setInputValue] = useState<string>(
    props?.value?.name || ""
  );
  // const [accounts, setAccounts] = useState<Account[]>([]);
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<ColumnDef<Record<string, any>>[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [PrimaryIdAttribute, setPrimaryIdAttribute] = useState<string>("");
  let debounceTimer: NodeJS.Timeout; // Declare the debounce timer here
  const [selectedRecordId, setSelectedRecordId] = useState(
    props.value?.id || ""
  );
  const [nextLink, setNextLink] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [entityPluralName, setEntityPluralName] = useState("");
  const [loadingMetadata , setLoadingMetadata ] = useState(false);
  const [primaryAttributeName, setPrimaryAttributeName] = useState(props.primaryAttributeName ? props.primaryAttributeName : "");
  const [search, setSearch] = useState({
    // [primaryAttributeName] : inputValue ? inputValue : props?.value?.name ? props.value?.name : "",
  });
  const [attributeMetaData, setAttrbuteMetaData] = useState<Record<string, {type : string, label : string}>>({})
  const [entityDisplayName, setEntityDisplayName] = useState<string>("");

  const MAX_COLUMNS = 4;

  console.log("search Data", search);

  // Initialize the table with sorting and pagination hooks
  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [],
    },
  });

  useEffect(() => {
    setInputValue(props.value?.name || "");
    // setNameSearch(props.value);
  }, [props.value]);

  useEffect(() => {

    const getMetaDataEntity = async() => {

      setLoadingMetadata(true);

      // converting string to array by spliting (,)
      const requestedFields = props.requiredFields;

      // fetching dynamic attributes from selected entity
      const attributes = await fetchSelectedMetadata(props.entity.toLowerCase(), requestedFields);
    
      // fetch dynamic plural name for the entity
      const entitySetName = await fetchEntityPluralName(props.entity);
      
      if(entitySetName) {
        setEntityPluralName(entitySetName);
      }

      // Sanitize fields removes spaces and empty strings
      const sanitizedFields = sanitizeRequiredFields(attributes)

      // Validating user requested fields and we got fields in meta data are same 
      const validFields = validateFields(requestedFields, sanitizedFields);
      console.log("Valid Fields:", validFields);

  
      // Building dynamic type
      const dynamicType = buildDynamicType(sanitizedFields);
      console.log(dynamicType);

      // Step 1: Convert the object to an array of key-value pairs
      const attribute = Object.entries(attributes);

      // Map the metadata to a dynamic field format
      // this is done because we need to generate dynamic column headers for the table
     const fields = attribute.map((attribute: any) => ({
       fieldName: attribute[0], // accessor 
       headerName: attribute[1]?.label,//header name
       dataType : attribute[1]?.type,
     }));

     const currencyCode = await fetchDefaultCurrencyCode()

      // utility function to Generate columns dynamically
      const dynamicColumns = generateDynamicColumns(currencyCode,fields);

      // Update the state of columns to render table header 
      // user can pass more than four fields slice it and enforce it to consider only 4 
      // setColumns(dynamicColumns.slice(0,MAX_COLUMNS-1));

      setColumns(dynamicColumns);
      
      //  Fetch primary column name for add default search feature dynamic to the primary column
       const primaryColumnName = await fetchPrimaryColumn(props.entity);
       
       const primaryAttributeId = await fetchPrimaryIdField(props.entity);

       const EntityDisplayName = await fetchEntityDisplayName(props.entity);

       setEntityDisplayName(EntityDisplayName);

       setPrimaryIdAttribute(primaryAttributeId);
       
      //  Set Primary Attribute Name 
       setPrimaryAttributeName(primaryColumnName);

       setAttrbuteMetaData(attributes);

       setLoadingMetadata(false);
    }

    getMetaDataEntity();

  }, [props.entity, props.requiredFields])

  const fetchRecords = async (
    searchFields: Record<string, string>,
    isSearch : boolean
  ): Promise<void> => {
    try {
      setLoading(true);

      const clientUrl = (
        window as any
      ).Xrm.Utility.getGlobalContext().getClientUrl();

      const selectQuery : string = buildSelectQuery(props.requiredFields, attributeMetaData) || props.requiredFields.join(",");
      const {filter, expand} = await buildFilterQuery(props.entity, props.searchFields, searchFields, "statecode eq 0", attributeMetaData);

      // console.log("filter", filter);

      if(selectQuery.length > 0 && entityPluralName.length > 0) {

      const url = nextLink && !isSearch 
        ? nextLink 
        : `${clientUrl}/api/data/v9.2/${entityPluralName ? entityPluralName : ""}?$select=${selectQuery},_ownerid_value${expand}${filter}&$orderby=createdon asc`;

      const req = new XMLHttpRequest();
      req.open("GET", url, true);

      req.setRequestHeader("OData-MaxVersion", "4.0");
      req.setRequestHeader("OData-Version", "4.0");
      req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
      req.setRequestHeader("Accept", "application/json");
      req.setRequestHeader("Prefer", "odata.include-annotations=*,odata.maxpagesize=100");
      req.onreadystatechange = async function () {
        if (this.readyState === 4) {
          req.onreadystatechange = null;

          if (this.status === 200) {
            const response = JSON.parse(this.responseText);
          

            // Reset accounts for search, append for pagination
          if (isSearch) {
            setRecords(response.value); // Replace previous records
            setNextLink(null); // Reset pagination
          } else {
            // setAccounts((prev) => [...prev, ...response.value]); // Append new records
            setRecords((prev) => {
              const existingIds = new Set(prev.map((record: DynamicEntity) => record[PrimaryIdAttribute]));
              const filteredRecords = response.value.filter(
                (record : DynamicEntity) => !existingIds.has(record[PrimaryIdAttribute])
              );
              return [...prev, ...filteredRecords];
            });
            
          }

            // Update nextLink or end pagination if no more data
            if (response["@odata.nextLink"]) {
              setNextLink(response["@odata.nextLink"]);
          
            } else {
              setHasMore(false);
            }


            // setIsModalOpen(true);
          } else {
            console.error(this.responseText);
          }

          // Set loading to false after the API response (success or error)
          setLoading(false);
        }
      };
      req.send();

    }

    } catch (error) {
      console.error("Error fetching accounts:", error);
      // Ensure loading state is stopped on error
      setLoading(false);
    }
  };
  
  function debouncedFetchAccounts(
    func: (searchFields: Record<string, string>, isSearch : boolean) => Promise<void>, // Function that matches the expected signature
    delay: number
  ) {
    return (searchFields: Record<string, string>, isSearch : boolean) => {
      clearTimeout(debounceTimer); // Clear the previous timer
      debounceTimer = setTimeout(() => func(searchFields, isSearch), delay); // Call the function after the delay
    };
  }

    // Handler for input field changes
    const handleInputChange = (fieldName: string, value: any) => {
      // Update the search state
    setSearch((prevData) => {
    const updatedSearch = {
      ...prevData,
      [fieldName]: value,
    };

    // Pass the updated value directly to debouncedFetchAccounts
    debouncedFetchAccounts(fetchRecords, 500)(
      updatedSearch, // Use updatedSearch here instead of relying on state
      true
    );

    return updatedSearch; // Update state with the new search object
  });
    };

  const handleSearchClick = () => {
    setIsModalOpen(true);
    setSearch({primaryAttributeName : inputValue});
 
    fetchRecords(search, true);
  };

  const handleRecordClick = (record: DynamicEntity) => {
    setInputValue(record?.name ? record?.name : record?.fullname);
    props.onChange({
      id: record[PrimaryIdAttribute],
      name: record[primaryAttributeName],
      entityType: props.entity,
    });
    setSelectedRecordId(record[PrimaryIdAttribute]);
    setIsModalOpen(false);
  };

  const handleClearLookup = () => {
    setInputValue(""); // Clear the input field // Clear the lookup value in the state/context
    setSelectedRecordId("");
    props.onChange(null);
  };

  const createRecordLink = (recordId: string): string => {

    const globalContext = (window as any).Xrm.Utility.getGlobalContext();
    const clientUrl = globalContext.getClientUrl(); // Base URL of the environment
    const appUrl = globalContext.getCurrentAppUrl(); // Current App's URL
    const appId = new URL(appUrl).searchParams.get("appid"); // Extract App ID

    // Construct and return the full URL to the account record
    return `${clientUrl}/main.aspx?appid=${appId}&pagetype=entityrecord&etn=${props.entity}&id=${recordId}`;
  };

  const rowHeight = 40; // Height of each row in pixels

  const handleScroll = (event: React.UIEvent<HTMLTableSectionElement>) => {
  const target = event.target as HTMLTableSectionElement;

  // Calculate first and last visible row indices
  const firstVisibleRowIndex = Math.floor(target.scrollTop / rowHeight);
  const lastVisibleRowIndex = Math.floor((target.scrollTop + target.clientHeight) / rowHeight);
  console.log("lastVisiblerowIndex",lastVisibleRowIndex);

  // Trigger API call if the 100th row is visible
  if (records.length > 0 && lastVisibleRowIndex >= records.length - 5 && loading == false && hasMore) {

    setLoading(true); // Show skeleton rows
    fetchRecords(search, false); // Fetch next 100 records

  }
  };

  const handleNewRecordClick = () => {

    const globalContext = (
      window as any
    ).Xrm.Utility.getGlobalContext();
    const appUrl = globalContext.getCurrentAppUrl();

    // Extract the App ID from the URL
    const appId = new URL(appUrl).searchParams.get("appid");

    const clientUrl = (
      window as any
    ).Xrm.Utility.getGlobalContext().getClientUrl();

    // Construct the account form URL dynamically
    const FormUrl = `${clientUrl}/main.aspx?appid=${appId}&pagetype=entityrecord&etn=${props.entity}`;

    // Redirect to the account creation form
    window.open(FormUrl, "_blank"); // Opens the form in a new tab
  }

   // Handle drag event
   const handleDragEnd = (event : any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex((col : any) => col.accessorKey === active.id);
    const newIndex = columns.findIndex((col  : any) => col.accessorKey === over.id);

    const updatedColumns = [...columns];
    const [movedColumn] = updatedColumns.splice(oldIndex, 1);
    updatedColumns.splice(newIndex, 0, movedColumn);

    setColumns(updatedColumns);
   };

  const throttledHandleScroll = _.throttle(handleScroll, 200);
  
  return React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { className: "input-container" },
      React.createElement("input", {
        type: "text",
        className: "main-lookup-input",
        value: inputValue,
        readOnly: props.disabled,
        onChange: (e) => handleInputChange("name", e.target.value),
        onClick: () => {
          if (selectedRecordId) {
            const recordLink = createRecordLink(selectedRecordId); // Dynamically generate the account record URL
            window.open(recordLink, "_blank"); // Navigate to the account record in a new tab
          }
        },
      }),
      inputValue
        ? React.createElement(
            "button",
            {
              className: "lookup-clear-button",
              onClick: () => {
                setInputValue(""); // Clear the input value
                handleClearLookup(); // Custom logic to clear selection in the PCF context
              },
              disabled: props.disabled,
            },
            "✖" // Cross icon
          )
        : null,
      React.createElement(
        "button",
        {
          className: "search-button",
          onClick: handleSearchClick,
          disabled: props.disabled,
        },
        React.createElement("i", { className: "search-icon" }, "🔍")
      )
    ),
    React.createElement(
      Modal,
      {
        isOpen: isModalOpen,
        onRequestClose: () => setIsModalOpen(false),
        contentLabel: "Available Accounts",
        className: "account-lookup-modal",
        overlayClassName: "modal-overlay",
      },
      React.createElement(
        "div",
        { className: "modal-header" },
        React.createElement(
          "h2",
          { className: "modal-title" },
          `${entityDisplayName || props.entity} Lookup Results`
        ),
        React.createElement(
          "button",
          { className: "close-button", onClick: () => setIsModalOpen(false) },
          "✖"
        )
      ),
      React.createElement(
        "div",
        { className: "modal-search searchBarContainer" },
        React.createElement(DynamicForm, {
          entityName: props.entity,
          fieldNames : props.searchFields,
          onSearch: handleInputChange,
          search : search,
          primaryColumn : primaryAttributeName, 
          requiredFields : props.requiredFields
        }),
        React.createElement(
          "button",
          {
            className: "Clear-btn",
            onClick: () => {
              setSearch({}); // Clear the search criteria
  
              // Reset table state
              setRecords([]);
              setNextLink(null);
              setHasMore(true);
              setLoading(true);
  
              fetchRecords(
                  {}
                ,
                false
              );
            },
          },
          "Clear"
        )
      ),
      React.createElement(
        "div",
        { className: "table-container" },
        React.createElement(
          DndContext,
          { onDragEnd: handleDragEnd },
          React.createElement(
            "table",
            { className: "account-Table" },
            React.createElement(
              "thead",
              { className: "Table-header" },
              // Add Skeleton Loader for Table Header
              loadingMetadata
                ? Array.from({ length: 1 }).map((_, index) =>
                  React.createElement(SkeletonRow, {
                    key: `skeleton-${index}`,
                    columns: 4,
                  })
                )
                : table.getHeaderGroups().map((headerGroup: HeaderGroup<any>) =>
                    React.createElement(
                      "tr",
                      { key: headerGroup.id },
                      headerGroup.headers.map((header) =>
                        React.createElement(
                          "th",
                          {
                            key: header.id,
                            onClick: header.column.getToggleSortingHandler(),
                          },
                          flexRender(header.column.columnDef.header, header.getContext()),
                          header.column.getIsSorted() === "asc"
                            ? " 🔼"
                            : header.column.getIsSorted() === "desc"
                            ? " 🔽"
                            : null
                        )
                      )
                    )
                  )
            ),
            React.createElement(
              "tbody",
              {
                className: "div-tbody-container tbody-scroll",
                onScroll: throttledHandleScroll,
              },
              loadingMetadata
                ? // Render Skeleton Loader for Body Rows
                Array.from({ length: 5 }).map((_, index) =>
                  React.createElement(SkeletonRow, {
                    key: `skeleton-${index}`,
                    columns: 4,
                  })
                )
                : [
                  // Render actual table rows (existing records)
                  ...table.getRowModel().rows.map((row: Row<DynamicEntity>) =>
                    React.createElement(
                      'tr',
                      {
                        key: row.id,
                        onClick: () => handleRecordClick(row.original),
                        className: selectedRecordId === row.original?.[PrimaryIdAttribute] ? 'highlighted-row' : '', // Apply the highlighted class
                      },
                      row.getVisibleCells().map((cell: Cell<any, unknown>) =>
                        React.createElement(
                          'td',
                          { key: cell.id },
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )
                      )
                    )
                  ),
              
                  // Render skeleton rows at the bottom if loading next batch
                  loading &&
                    Array.from({ length: 5 }).map((_, index) =>
                      React.createElement(SkeletonRow, {
                        key: `skeleton-${index}`,
                        columns: table.getAllColumns().length,
                      })
                    ),
              
                  // Handle empty table case when no records are present
                  records.length === 0 &&
                    React.createElement(
                      'tr',
                      { key: 'no-records-row' },
                      React.createElement(
                        'td',
                        { colSpan: table.getAllColumns().length, style: { textAlign: 'center' } },
                        Object.entries(search).length > 0
                          ? 'No records found for the current search criteria.'
                          : 'No records available.'
                      )
                    ),
                ],
            )
          ), 
        ),
         // Create New Account Button (kept)
         React.createElement(
          "div",
          { className: "pagination-controls" },
          React.createElement(
            "div",
            null,
            React.createElement(
              "button",
              {
                className: "create-contact-button",
                onClick: handleNewRecordClick
              },
              `New ${entityDisplayName || props.entity}`
            )
          )
        )
      )
    )
  );
};

const SkeletonRow = ({ columns }: { columns: number }) =>
  React.createElement(
    "tr",
    { key: "skeleton-row", className: "skeleton-row" },
    Array.from({ length: columns }).map((_, index) =>
      React.createElement(
        "td",
        { key: `skeleton-cell-${index}` },
        React.createElement("div", { className: "skeleton-loader" })
      )
    )
);

export default AccountLookupModal;


