# 🔍 Generic Lookup PCF Control for Dynamics 365

A custom **PowerApps Component Framework (PCF)** control that enhances the standard Dynamics 365 lookup field with **multi-field search**, **scroll-based pagination**, and **responsive design**.

---

## 🚀 Purpose

The default Dynamics 365 lookup control has limitations—especially the inability to search using multiple fields with **AND conditions** (e.g., Name AND City).

This control addresses that gap with:
- Multi-field search using AND logic
- Customizable and reusable across entities
- Enhanced user experience with improved performance

---

## 🎯 Key Features

✅ **Reusable Across Entities**  
Use the control on any Dataverse entity. Import once and reuse anywhere.

✅ **Configurable Search Fields**  
Specify which fields to use for searching (e.g., name, city, account number).

✅ **Configurable Table Columns**  
Define which columns appear in the result table using logical names.

✅ **Multi-Field Search (AND Condition)**  
Search records based on multiple conditions at once.

✅ **Scroll-Based Pagination**  
Loads data dynamically as the user scrolls to improve performance.

✅ **Responsive & Accessible**  
Designed to work seamlessly across all devices and screen readers.

---

## 🧱 Built With

- PowerApps Component Framework (PCF)
- TypeScript
- React
- Microsoft Power Platform CLI

---

## 📦 Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/KunalWalmiki/Generic-PCF-Lookup.git

2. Install dependencies:
    npm install

3. Build the PCF component:
   npm run build

4. Package the solution:
   pac solution init --publisher-name <name> --publisher-prefix <prefix>
   pac solution add-reference --path .
   msbuild /t:build /restore

5. Import the generated .zip into Power Apps > Solutions.

6. Add the control to the form field via Form Editor > Controls.

