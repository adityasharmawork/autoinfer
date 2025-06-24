# AutoInfer

[![npm version](https://img.shields.io/npm/v/autoinfer)](https://www.npmjs.com/package/autoinfer) 

A zero-configuration CLI utility and library to automatically generate TypeScript interfaces or JSON Schemas from JSON files, API responses, CSV data, and database schemas (MongoDB, MySQL, PostgreSQL). TypeInfer accelerates TypeScript development by inferring types, optional properties, and custom fields interactively or via command-line arguments, with robust error handling.

---

## Features

- **Multi-source support**: JSON files, API endpoints, CSV files, and database schemas (MongoDB collections, MySQL tables, PostgreSQL tables).  
- **Output formats**: TypeScript interfaces or JSON Schema.  
- **Optional property inference**: Mark fields optional automatically, with the ability to add custom optional fields interactively or via flags.  
- **Automatic type detection**: Numbers, booleans, strings, arrays, nested objects, and database-specific types.  
- **Union deduplication**: Removes duplicate types in union definitions (`string | string ➔ string`).  
- **Prettified output**: For clean, consistent code style.  
- **Interactive CLI**: Step-by-step prompts via for easy usage.  
- **Programmatic API**: Generate schemas or infer types within your own Node.js scripts.  
- **Robust error handling**: Graceful CLI errors with clear, user-friendly messages.  
- **Database schema inference**: Automatically detect and map database types to TypeScript/JSON Schema types.

---

## Installation

```bash
npm install -g autoinfer    # global install for CLI
# or as a dev dependency:
npm install --save-dev autoinfer
```
---

## CLI Usage

## AutoInfer supports two modes:

### 1. Interactive Mode (default)

Run the CLI without arguments:

```bash
$ autoinfer
```

You will be prompted to:

- **Select data source type**: JSON, API, CSV, MongoDB, MySQL, or PostgreSQL.

Provide data:
-   **JSON**: enter the path to a local JSON file.
-   **API**: enter the full endpoint URL.
-   **CSV**: enter the path to a local CSV file.
-   **MongoDB**: enter connection string and collection name.
-   **MySQL**: enter connection details (host, user, password, database) and table name.
-   **PostgreSQL**: enter connection details (host, user, password, database) and table name.

- **Select output format**: TypeScript or JSON Schema.
- **Interface/schema name**: define your root type name (e.g. User or DataSchema).
- **Infer optional properties?** Yes/No.
- **Add custom fields interactively (if applicable).**
- **Prettify output.**
- **Save to file or print to the terminal.**

---

### Example (JSON file → TypeScript)
```bash
$ autoinfer
Welcome to AutoInfer - Interactive Mode
✔ Select data source type: JSON
✔ Enter JSON file path: ./data/config.json
✔ Select output format: TypeScript
✔ Interface name: Config
✔ Infer optional properties? No
✔ Prettify output? Yes
✔ Save to a new file? Yes
✔ Output file path: ./src/types/config.ts

// File "./src/types/config.ts" written successfully!
```

### Example (MongoDB → TypeScript)
```bash
$ autoinfer
Welcome to AutoInfer - Interactive Mode
✔ Select data source type: MongoDB
✔ Enter MongoDB connection string: mongodb://localhost:27017
✔ Enter database name: mydb
✔ Enter collection name: users
✔ Select output format: TypeScript
✔ Interface name: User
✔ Infer optional properties? Yes
✔ Prettify output? Yes
✔ Save to a new file? Yes
✔ Output file path: ./src/types/user.ts

// File "./src/types/user.ts" written successfully!
```

### Example (MySQL → TypeScript)
```bash
$ autoinfer
Welcome to AutoInfer - Interactive Mode
✔ Select data source type: MySQL
✔ Enter MySQL host: localhost
✔ Enter MySQL user: root
✔ Enter MySQL password: ****
✔ Enter database name: myapp
✔ Enter table name: products
✔ Select output format: TypeScript
✔ Interface name: Product
✔ Infer optional properties? Yes
✔ Prettify output? Yes
✔ Save to a new file? Yes
✔ Output file path: ./src/types/product.ts

// File "./src/types/product.ts" written successfully!
```

---

### 2. Arguments Mode (scriptable)
All interactive prompts can be replaced by CLI flags:

```bash
$ autoinfer \
  --source api \
  --endpoint https://api.example.com/users \
  --format ts \
  --name UserList \
  --inferOptional true \
  --extraFields notes:string,tags:string[] \
  --prettify true \
  --output ./src/types/users.ts
Flag	Alias	Description	Required
--source	-s	json, api, csv, mongodb, mysql, postgresql	✅ yes
--file	-f	Path to JSON or CSV file	When --source=json/csv
--endpoint	-u	URL for API source	When --source=api
--dbUri		Database connection string	When --source=mongodb
--dbHost		Database host	When --source=mysql/postgresql
--dbUser		Database user	When --source=mysql/postgresql
--dbPass		Database password	When --source=mysql/postgresql
--dbName		Database name	When --source=mongodb/mysql/postgresql
--collection		MongoDB collection name	When --source=mongodb
--table		Table name	When --source=mysql/postgresql
--format		ts or jsonSchema	✅ yes
--name	-n	Root type or schema name	✅ yes
--inferOptional		true or false	❌ default: false
--extraFields		Comma-separated name:type pairs	When --inferOptional=true
--prettify		true or false	❌ default: true
--output	-o	File path to save output; omit to print to stdout	❌
```

---

Examples
```bash
# 1. CSV → TS with optional inference
$ autoinfer -s csv -f ./data/users.csv -n User \
  --format ts --inferOptional true --prettify true -o ./types/users.ts

# 2. JSON file → JSON Schema
$ autoinfer -s json -f ./input/config.json \
  --format jsonSchema -n ConfigSchema -o ./schemas/config.schema.json

# 3. API → TS with extra custom fields
$ autoinfer -s api -u https://api.example.com/items \
  --format ts --name ItemList --inferOptional true \
  --extraFields notes:string,tags:string[] --output ./types/items.ts

# 4. MongoDB → TS
$ autoinfer -s mongodb --dbUri mongodb://localhost:27017 \
  --dbName mydb --collection users \
  --format ts --name User --inferOptional true -o ./types/user.ts

# 5. MySQL → TS
$ autoinfer -s mysql --dbHost localhost --dbUser root --dbPass secret \
  --dbName myapp --table products \
  --format ts --name Product -o ./types/product.ts

# 6. PostgreSQL → JSON Schema
$ autoinfer -s postgresql --dbHost localhost --dbUser postgres --dbPass secret \
  --dbName myapp --table orders \
  --format jsonSchema --name OrderSchema -o ./schemas/order.schema.json
```

---

Refer to the AutoInfer API docs for full details.

## Error Handling
AutoInfer uses a custom CliError to present clear messages.

Common errors include:

-**Invalid file path**:
"Could not load JSON from './foo.ts'. Please ensure the file exists and contains valid JSON."

-**Invalid API endpoint**:
"Failed to fetch data from 'htp://...'. Invalid URL."

-**CSV parse errors**:
"Failed to parse CSV file: Unexpected header row."

-**Database connection errors**:
"Failed to connect to MongoDB: Invalid connection string."
"Failed to connect to MySQL: Access denied for user."
"Failed to connect to PostgreSQL: Connection timed out."

-**Database schema errors**:
"Failed to read MongoDB collection schema: Collection not found."
"Failed to read MySQL table schema: Table does not exist."
"Failed to read PostgreSQL table schema: Permission denied."

All errors exit with code 1, making AutoInfer safe for CI workflows.

