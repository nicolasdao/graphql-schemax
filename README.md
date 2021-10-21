# GRAPHQL-SCHEMAX

Creates GraphQL string schema from plain JSON objects. Managing GraphQL schemas via plain JSON objects offers the following advantages:
- Composition: Reuse the same base object in inputs or types.
- Separation of concerns: Isolate your domain in modules and merge them later. 
- Inspection: Easily traverse the schema tree.
- Leaner: Define GraphQL types, enums and inputs on-the-fly (_anonymous types_) instead of having to define them explicitly. 

This package works with both ES6 modules and CommonJS and contains no dependencies.

```
npm i graphql-schemax
```

```js
import { Schemax } from 'graphql-schemax'
// const { Schemax } = require('graphql-schemax') // CommonJS

const schema = new Schemax(
	'type Query', {
		users: { where: { id:'ID', first_name:'String', last_name:'String', email:'String' }, sort: { by:['first_name', 'last_name'], dir:['asc', 'desc'] }, limit: 'Int', ':': [{
			id:'ID',
			first_name:'String',
			last_name:'String',
			email:'String'
		}] }
	},
	'type Mutation', {
		createUser: { user: { first_name:'String', last_name:'String', email:'String'}, ':':{
			id:'ID',
			first_name:'String',
			last_name:'String',
			email:'String'
		} }
	}
)

console.log(schema.toString())
```

This code outputs the following string:

```js
type Query {
	users(where: Input_0826775903, sort: Input_0419529037, limit: Int): [Type_0826775903]
}

type Mutation {
	createUser(user: Input_01074650554): Type_0826775903
}

input Input_0826775903 {
	id: ID
	first_name: String
	last_name: String
	email: String
}

enum Enum_0110021644 {
	first_name
	last_name
}

enum Enum_1894885946 {
	asc
	desc
}

input Input_0419529037 {
	by: Enum_0110021644
	dir: Enum_1894885946
}

type Type_0826775903 {
	id: ID
	first_name: String
	last_name: String
	email: String
}

input Input_01074650554 {
	first_name: String
	last_name: String
	email: String
}

schema {
	query: Query
	mutation: Mutation
}
```

# Table of contents

> * [Getting started](#getting-started)
>	- [Quick overview](#quick-overview)
>	- [Required anonymous types](#required-anonymous-types)
>	- [Naming anonymous types](#naming-anonymous-types)
>	- [Directives](#directives)
> * [Manipulating schemas](#manipulating-schemas)
>	- [Merging schemas](#merging-schemas)
> * [Dev](#dev)
>	- [About this project](#about-this-project)
>	- [Building this project for both CommonJS and ES6 modules](#building-this-project-for-both-commonjs-and-es6-modules)
>	- [Unit test](#unit-test)
> * [License](#license)

# Getting started
## Quick overview

```js
import { Schemax } from 'graphql-schemax'
// const { Schemax } = require('graphql-schemax') // CommonJS

const schema = new Schemax(
	'type Query', {
		users: { where: { id:'ID', first_name:'String', last_name:'String', email:'String' }, sort: { by:['first_name', 'last_name'], dir:['asc', 'desc'] }, limit: 'Int', ':': [{
			id:'ID',
			first_name:'String',
			last_name:'String',
			email:'String'
		}] }
	},
	'type Mutation', {
		createUser: { user: { first_name:'String', last_name:'String', email:'String'}, ':':{
			id:'ID',
			first_name:'String',
			last_name:'String',
			email:'String'
		} }
	}
)

console.log(schema.toString())
```

This code outputs the following string:

```js
type Query {
	users(where: Input_0826775903, sort: Input_0419529037, limit: Int): [Type_0826775903]
}

type Mutation {
	createUser(user: Input_01074650554): Type_0826775903
}

input Input_0826775903 {
	id: ID
	first_name: String
	last_name: String
	email: String
}

enum Enum_0110021644 {
	first_name
	last_name
}

enum Enum_1894885946 {
	asc
	desc
}

input Input_0419529037 {
	by: Enum_0110021644
	dir: Enum_1894885946
}

type Type_0826775903 {
	id: ID
	first_name: String
	last_name: String
	email: String
}

input Input_01074650554 {
	first_name: String
	last_name: String
	email: String
}

schema {
	query: Query
	mutation: Mutation
}
```

Notice that:
- The GraphQL `input` are automatically generated. They are referred as anonymous inputs. The naming convention is `Input_<hash>` where `<hash>` is the hash of the input definition. The same mechanism is used for anonymous `type` and `enum`. This strategy allows to avoid unecessary type duplication. This can be seen with the output of the `users` and `createUser` methods. The same object results in a single schema definition called `Type_0826775903`.
- GraphQL `enum` (e.g., `by:['first_name', 'last_name']`) uses an array instead of an object. 
- Arguments such as those defined on the `users` and `createUser` methods are represented by an object that uses this convention:
	- { argument01: 'TypeDefinition', argument02: 'TypeDefinition', ':': 'TypeDefinition' }
	- The last property must always be `':'`, which represents the output. This property is required.
	- `first_name:'String'` is actually a shortcut for `first_name: { ':': 'String' }`.

If you wish to be explicit about each type, the example above can be re-written as follow:

```js
const schema = new Schemax(
	'type User', {
		id:'ID',
		first_name:'String',
		last_name:'String',
		email:'String'
	},
	'input WhereUser', {
		id:'ID', 
		first_name:'String', 
		last_name:'String', 
		email:'String'
	},
	'input SortUser', {
		by: 'SortByEnum', 
		dir: 'DirEnum'
	},
	'input InsertUser', {
		first_name:'String', 
		last_name:'String', 
		email:'String'
	},
	'enum SortByEnum', [
		'first_name', 
		'last_name'
	],
	'enum DirEnum', [
		'asc', 
		'desc'
	],
	'type Query', {
		users: { where: 'WhereUser', sort: 'SortUser', limit: 'Int', ':': '[User]' }
	},
	'type Mutation', {
		createUser: { user: 'InsertUser', ':': 'User' }
	}
)
console.log(schema.toString())
```

Which outputs:

```js
type User {
	id: ID
	first_name: String
	last_name: String
	email: String
}

input WhereUser {
	id: ID
	first_name: String
	last_name: String
	email: String
}

input SortUser {
	by: SortByEnum
	dir: DirEnum
}

input InsertUser {
	first_name: String
	last_name: String
	email: String
}

enum SortByEnum {
	first_name
	last_name
}

enum DirEnum {
	asc
	desc
}

type Query {
	users(where: WhereUser, sort: SortUser, limit: Int): [User]
}

type Mutation {
	createUser(user: InsertUser): User
}

schema {
	query: Query
	mutation: Mutation
}
```

Notice that `enum` definitions use arrays instead of objects.

## Required anonymous types

Use the `__required` property as follow:

```js
const schema = new Schemax(
	'type Query', {
		users: { where: { id:'ID', first_name:'String', __required:true }, ':': [{
			id:'ID',
			first_name:'String',
			last_name:'String',
			email:'String'
		}] }
	}
)

console.log(schema.toString())
```

Which outputs:

```js
type Query {
	users(where: Input_01605579239!): [Type_0826775903]
}

input Input_01605579239 {
	id: ID
	first_name: String
}

type Type_0826775903 {
	id: ID
	first_name: String
	last_name: String
	email: String
}

schema {
	query: Query
}
```

## Naming anonymous types

Use the `__name` property as follow:

```js
const schema = new Schemax(
	'type Query', {
		users: { where: { id:'ID', first_name:'String', __required:true, __name: 'WhereUserInput' }, ':': [{
			id:'ID',
			first_name:'String',
			last_name:'String',
			email:'String',
			__name: 'User'
		}] }
	}
)

console.log(schema.toString())
```

Which outputs:

```js
type Query {
	users(where: WhereUserInput!): [User]
}

input WhereUserInput {
	id: ID
	first_name: String
}

type User {
	id: ID
	first_name: String
	last_name: String
	email: String
}

schema {
	query: Query
}
```

## Directives

```js
const schema = new Schemax(
	`directive @deprecated(
		reason: String = "No longer supported"
	) on FIELD_DEFINITION | ENUM_VALUE`, null,
	'type Query @aws_cognito_user_pools', {
		users: { where: { id:'ID', first_name:'String', __required:true, __name: 'WhereUserInput' }, ':': [{
			id:'ID @aws_auth',
			first_name:'String',
			last_name:'String',
			'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null,
			email:'String',
			__name: 'User'
		}] }
	}
)
```

Which outputs:

```js
directive @deprecated(
	reason: String = "No longer supported"
) on FIELD_DEFINITION | ENUM_VALUE

type Query @aws_cognito_user_pools {
	users(where: WhereUserInput!): [User]
}

input WhereUserInput {
	id: ID
	first_name: String
}

type User {
	id: ID @aws_auth
	first_name: String
	last_name: String
	@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
	email: String
}

schema {
	query: Query
}
```

Notice how the directive must be followed by `null`.

# APIs
## `constructor`

The `Schemax` class supports an undefined amount of arguments. It supports an inline schema definitions as well as arrays of inline schema definitions.

__*Inline schema definitions*__

```js
import { Schemax } from 'graphql-schemax'

const schema = new Schemax(
	'type Project', {
		id: 'ID',
		name: 'String'
	},
	'type User', {
		id: 'ID',
		first_name: 'String',
		last_name: 'String'
	},
	'type Query', {
		projects: '[Project]',
		users: '[User]'
	}
)

console.log(schema.toString())
```

Which can also be written as follow:

```js
import { Schemax } from 'graphql-schemax'

const inlineSchema = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query', {
	projects: '[Project]',
	users: '[User]'
}]

const schema = new Schemax(...inlineSchema)

console.log(schema.toString())
```

__*Array schema definitions*__

```js
import { Schemax } from 'graphql-schemax'

const inlineSchema = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query', {
	projects: '[Project]',
	users: '[User]'
}]

const schema = new Schemax(inlineSchema)

console.log(schema.toString())
```

or 

```js
import { Schemax } from 'graphql-schemax'

const inlineSchema = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query', {
	projects: '[Project]',
	users: '[User]'
}]

const schema = new Schemax(inlineSchema)

console.log(schema.toString())
```

# FAQ
## How to merge schemas?

# Dev
## About this project

This project is built using ES6 modules located under the `src` folder. All the entry point definitions are located in the `package.json` under the `exports` property.

[`rollup`](https://rollupjs.org/) is used to compile the ES6 modules to CommonJS.

## Building this project for both CommonJS and ES6 modules

```
npm run build
```

This command compiles the ES6 modules located under the `src` folder to `.cjs` file sent to the `dist` folder.

## Unit test

```
npm test
```

# License

BSD 3-Clause License

Copyright (c) 2019-2021, Cloudless Consulting Pty Ltd
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


