import * as React from "react";
import * as ReactDOM from "react-dom";
import CustomFramework, { IInputs, IOutputs } from "./generated/CustomeTypes";
import AccountLookupModal from "./src/LookupModal"; 
import { fetchPrimaryColumnLabel, fetchPrimaryIdField, getUniqueFields } from "./utility/utilityFunctions";
// import "./css/AccountLookupModal.css"
import ErrorBoundary from "./utility/ErrorBoundry";

export class GenericLookup implements ComponentFramework.StandardControl<IInputs, IOutputs> {
   
   private _notifyOutputChanged: () => void;
   private _container: HTMLDivElement;
   private _context: ComponentFramework.Context<IInputs>;
   private _lookupValue: CustomFramework.EntityReference | null;
   private _filterCriteria: string | undefined;
   private _disabled : boolean | undefined;
   private _entityName : string;
   private _requiredFields : string[] ;
   private _searchFields : string[] | undefined;
   private _primaryArrtibuteName : string | undefined;

   constructor() {
       this._lookupValue = null;
       this._disabled = false;
   }

   public async init(
       context: ComponentFramework.Context<IInputs>,
       notifyOutputChanged: () => void,
       state: ComponentFramework.Dictionary,
       container: HTMLDivElement
   ) {
       this._context = context;
       this._notifyOutputChanged = notifyOutputChanged;
       this._container = container;


        // Retrieve and use the entity ID
        const entityId = this.getCurrentEntityId();
        console.log("Entity ID:", entityId);

        if(entityId) 
           this.retrieveQuoteRecord("quotes", entityId, "?$select=statecode");


      

       //configure values from parameter    
       this._filterCriteria = context.parameters.filterCriteria.raw; 
       this._entityName = context.parameters.Entity.raw;
       this._requiredFields = getUniqueFields(context.parameters.RequiredFields.raw ? context.parameters.RequiredFields.raw : []);
       this._searchFields = getUniqueFields(context.parameters.SearchFields.raw ? context.parameters.SearchFields.raw : []);

       // Fetch the primary ID field for the given entity
       this._primaryArrtibuteName = await fetchPrimaryIdField(this._entityName);

       await this.loadLookupData(context);
       this.renderControl();
   }

     // Retrieve the current entity ID using Xrm
     private getCurrentEntityId(): string | null {
        if ((window as any).Xrm) {
            const entityId = (window as any).Xrm.Page.data.entity.getId();
            return entityId ? entityId.replace("{", "").replace("}", "") : null; // Remove curly braces if present
        } else {
            console.warn("Xrm is not available in this context.");
            return null;
        }
    }

    public async retrieveQuoteRecord(
        entityName: string,
        entityId: string,
        selectFields: string
      ): Promise<void> {
        try {
          const clientUrl = (window as any).Xrm.Utility.getGlobalContext().getClientUrl();
          const url = `${clientUrl}/api/data/v9.2/${entityName}(${entityId})${selectFields}`;
      
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "OData-MaxVersion": "4.0",
              "OData-Version": "4.0",
              "Content-Type": "application/json; charset=utf-8",
              Accept: "application/json",
              Prefer: "odata.include-annotations=*",
            },
          });
      
          if (response.ok) {
            const record = await response.json();
            if (
              record.statecode === 1 ||
              record.statecode === 2 ||
              record.statecode === 3
            ) {
              // Assuming '1' represents "Active"
              this._disabled = true; // Lock the field
              console.log("Field locked (quote is active).");
            } else {
              this._disabled = false; // Unlock the field
              console.log("Field unlocked (quote is not active).");
            }
          } else {
            console.error(
              "Error retrieving record. HTTP Status:",
              response.status,
              response.statusText
            );
            this._disabled = false; // Default to unlocked on error
          }
        } catch (error) {
          console.error("Network error while retrieving the record:", error);
          this._disabled = false; // Default to unlocked on error
        } finally {
          this.renderControl();
        }
    }
      

   public async updateView(context: ComponentFramework.Context<IInputs>): Promise<void> {
       this._context = context;
       const newFilterCriteria = context.parameters.filterCriteria.raw;

       // Re-fetch data if filter criteria changes
       if (newFilterCriteria !== this._filterCriteria) {
           this._filterCriteria = newFilterCriteria;
           await this.loadLookupData(context);
       }

       await this.loadLookupData(context);
       this.renderControl();
   }

   private async loadLookupData(context: ComponentFramework.Context<IInputs>) {
       const lookupRaw = context.parameters.lookupField.raw;
       if (lookupRaw && lookupRaw.length > 0) {
           const lookupId = lookupRaw[0]?.id;
           const lookupName = lookupRaw[0]?.name;
           if (lookupId && !lookupName) {
               try {
                   // Fetch account name from Dataverse if it's missing
                   const account = await context.webAPI.retrieveRecord("account", lookupId, "?$select=name");
                   this._lookupValue = { id: lookupId, name: account.name, entityType: "account" };

               } catch (error) {
                   console.error("Error fetching account name:", error);
               }
           } else {
               this._lookupValue = lookupRaw[0];
           }
       } else {
           this._lookupValue = null;
       }
   }

   public getOutputs(): IOutputs {
       return {
           lookupField: this._lookupValue ? [this._lookupValue] : undefined
       };
   }

   public destroy(): void {
       ReactDOM.unmountComponentAtNode(this._container);
   }

   private handleLookupChange = (newValue: CustomFramework.EntityReference) => {
       this._lookupValue = newValue;
       this._notifyOutputChanged();
       this.renderControl();
   };

   private renderControl(): void {
       ReactDOM.render(
        React.createElement(ErrorBoundary, null, 
           React.createElement(
            AccountLookupModal, {
               context: this._context,
               notifyOutputChanged: this._notifyOutputChanged,
               value: this._lookupValue ? this._lookupValue : null,
               onChange: this.handleLookupChange,
               filterCriteria : this._filterCriteria ? this._filterCriteria : undefined,  
               disabled : this._disabled,
               entity : this._entityName,
               requiredFields : this._requiredFields,
               searchFields : this._searchFields ? this._searchFields : [],
               primaryAttributeName : this._primaryArrtibuteName ? this._primaryArrtibuteName : "",
            }
          ), 
       ), this._container);
   }

}

