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
>		- [Required anonymous Type and Input](#required-anonymous-type-and-input)
>		- [Required anonymous Enum](#required-anonymous-enum)
>		- [Required non-empty anonymous array](#required-non-empty-anonymous-array)
>	- [Naming anonymous types](#naming-anonymous-types)
>		- [Naming anonymous Type and Input](#naming-anonymous-type-and-input)
>		- [Naming anonymous Enum](#naming-anonymous-enum)
>	- [Directives](#directives)
> * [APIs](#apis)
>	- [`constructor`](#constructor)
>	- [`toString`](#tostring)
>	- [`add`](#add)
>	- [`addTypeResolutions`](#addtyperesolutions)
>		- [Renaming a type](#renaming-a-type)
>		- [Merging types](#merging-types)
>			- [Keeping the longest type](#keeping-the-longest-type)
>			- [Keeping the shortest type](#keeping-the-shortest-type)
>			- [Custom merge](#custom-merge)
> * [Dev](#dev)
>	- [About this project](#about-this-project)
>	- [Building this project for both CommonJS and ES6 modules](#building-this-project-for-both-commonjs-and-es6-modules)
>	- [Unit test](#unit-test)
> * [FAQ](#faq)
>	- [How to merge schemas?](#how-to-merge-schemas)
>	- [What happens when the same type definitions exist in multiple schemas?](#what-happens-when-the-same-type-definitions-exist-in-multiple-schemas)
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
### Required anonymous Type and Input 

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

### Required anonymous Enum

To make an anonymous enum required, use the reserved `__required` string:

```js
const schema = [
	'type Query', {
		products:{ type:['car','home','furniture','__required'], ':':{ name:'String' } }
	}
]

console.log(new Schemax(schema).toString())
```

Which outputs:

```js
type Query {
	products(type: Enum_11845869194!): Type_12078318863
}

enum Enum_11845869194 {
	car
	furniture
	home
}

type Type_12078318863 {
	name: String
}

schema {
	query: Query
}
```

### Required non-empty anonymous array

Use the `__noempty` keyword to create enums similar to `[RoleEnum!]`. 

```js
const schema = [
	'type Mutation', {
		invite: { users:[{ 
			id:'ID', 
			email:'String', 
			roles:[['admin','writer','reader','__required','__noempty','__name:RoleEnum']],
			__noempty:true, 
			__name:'UserInviteInput' 
		}], ':':{ message:'String', __name:'Message' } }
	}
]

console.log(new Schemax(schema).toString())
```

Which outputs:

```js
type Mutation {
	invite(users: [UserInviteInput!]): Message
}

enum RoleEnum {
	admin
	reader
	writer
}

input UserInviteInput {
	id: ID
	email: String
	roles: [RoleEnum!]!
}

type Message {
	message: String
}

schema {
	mutation: Mutation
}
```

## Naming anonymous types
### Naming anonymous Type and Input 

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

### Naming anonymous Enum

To use a custom enum, use the reserved `__name:YOUR_NAME` string:

```js
const schema = [
	'type Query', {
		products:{ type:['car','home','furniture','__name:ProductTypeEnum'], ':':{ name:'String' } }
	}
]

console.log(new Schemax(schema).toString())
```

```js
type Query {
	products(type: ProductTypeEnum): Type_12078318863
}

enum ProductTypeEnum {
	car
	furniture
	home
}

type Type_12078318863 {
	name: String
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

const inlineSchema01 = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type Query', {
	projects: '[Project]'
}]

const inlineSchema02 = [
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query', {
	users: '[User]'
}]

const schema = new Schemax(inlineSchema01, inlineSchema02)

console.log(schema.toString())
```

> __NOTICE:__ The `type Query` is defined twice. When Schemax detects multiple identical definitions, it merges them. This means that in this example, the output is equal to:
> ```js
> type Query {
> 	projects: [Project]
> 	users: [User]
> }
> ```

Finally, the constructor also support mixing those two styles:

```js
const schema = new Schemax(inlineSchema01, 
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query', {
	users: '[User]'
})
```

## `toString`

Compiles the `Schemax` instance to a GraphQL string. 

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

Which outputs:

```js
type Project {
	id: ID
	name: String
}

type User {
	id: ID
	first_name: String
	last_name: String
}

type Query {
	projects: [Project]
	users: [User]
}

schema {
	query: Query
}
```

## `add`

Mutates the `Schemax` instance by adding more schema definitions. It supports the same signature as the [`constructor`](#constructor).

```js
import { Schemax } from 'graphql-schemax'

const inlineSchema01 = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type Query', {
	projects: '[Project]'
}]

const inlineSchema02 = [
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query', {
	users: '[User]'
}]

const schema = new Schemax()

console.log('SAMPLE 01')
console.log(schema.toString())

schema.add(inlineSchema01)

console.log('SAMPLE 02')
console.log(schema.toString())

schema.add(inlineSchema02, 
'type Address', {
	id: 'ID',
	line01: 'String'
})

console.log('SAMPLE 03')
console.log(schema.toString())
```

Which outputs:

```js
// SAMPLE 01

// SAMPLE 02
type Project {
	id: ID
	name: String
}

type Query {
	projects: [Project]
}

schema {
	query: Query
}
// SAMPLE 03
type Project {
	id: ID
	name: String
}

type Query {
	projects: [Project]
	users: [User]
}

type User {
	id: ID
	first_name: String
	last_name: String
}

type Address {
	id: ID
	line01: String
}

schema {
	query: Query
}
```

## `addTypeResolutions`

Helps renaming or merging types by explicitly controlling how type names are resolved.

### Renaming a type

```js
import { Schemax } from 'graphql-schemax'

const inlineSchema01 = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type Query', {
	projects: '[Project]'
}]

const inlineSchema02 = [
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query', {
	users: '[User]'
}]

const schema = new Schemax(...inlineSchema01, ...inlineSchema02)
schema.addTypeResolutions([{
	def: 'type User', to: 'type User @aws_api_key'
}])

console.log(schema.toString())
```

### Merging types
#### Keeping the longest type

```js
import { Schemax } from 'graphql-schemax'

const inlineSchema01 = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type Query', {
	projects: '[Project]'
}]

const inlineSchema02 = [
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query @aws_api_key', {
	users: '[User]'
}]

const schema = new Schemax(...inlineSchema01, ...inlineSchema02)
schema.addTypeResolutions([{
	def: /^type Query(\s|$)/, keepLongest:true
}])

console.log(schema.toString())
```

Which returns:

```js
type Project {
	id: ID
	name: String
}

type User {
	id: ID
	first_name: String
	last_name: String
}

type Query @aws_api_key {
	projects: [Project]
	users: [User]
}

schema {
	query: Query
}
```

#### Keeping the shortest type

```js
import { Schemax } from 'graphql-schemax'

const inlineSchema01 = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type Query', {
	projects: '[Project]'
}]

const inlineSchema02 = [
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query @aws_api_key', {
	users: '[User]'
}]

const schema = new Schemax(...inlineSchema01, ...inlineSchema02)
schema.addTypeResolutions([{
	def: /^type Query(\s|$)/, keepShortest:true
}])

console.log(schema.toString())
```

Which returns:

```js
type Project {
	id: ID
	name: String
}

type User {
	id: ID
	first_name: String
	last_name: String
}

type Query {
	projects: [Project]
	users: [User]
}

schema {
	query: Query
}
```

#### Custom merge

```js
import { Schemax } from 'graphql-schemax'

const inlineSchema01 = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type Query @aws_cognito_user_pools', {
	projects: '[Project]'
}]

const inlineSchema02 = [
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Query @aws_api_key', {
	users: '[User]'
}]

const schema = new Schemax(...inlineSchema01, ...inlineSchema02)
schema.addTypeResolutions([{
	def: /^type Query(\s|$)/, 
	reduce:(oldType, newType, context) => { // fired for each type that matches the regex /^type Query(\s|$)/
		const attributes = newType.replace('type Query', '').split(' ').filter(x => x)
		if (!context.attributes)
			context.attributes = new Set(attributes)
		else
			attributes.forEach(a => context.attributes.add(a))

		const attrs = Array.from(context.attributes)
		return attrs.length ? `type Query ${attrs.join(' ')}` : 'type Query'
	}
}])

console.log(schema.toString())
```

Which returns:

```js
type Project {
	id: ID
	name: String
}

type User {
	id: ID
	first_name: String
	last_name: String
}

type Query @aws_cognito_user_pools @aws_api_key {
	projects: [Project]
	users: [User]
}

schema {
	query: Query
}
```

# Dev
## About this project

This project is built using ES6 modules located under the `src` folder. All the entry point definitions are located in the `package.json` under the `exports` property.

[`rollup`](https://rollupjs.org/) is used to compile the ES6 modules to CommonJS.

## Building this project for both CommonJS and ES6 modules

```
npm run build
```

This command compiles the ES6 modules located under the `src` folder to `.cjs` file sent to the `dist` folder.

> This command is aitomatically executed before exah deployment to make sure the latest build is always depployed.

## Unit test

```
npm test
```

# FAQ
## How to merge schemas?

Both the [`constructor`](#constructor) and [`add`](#add) APIs support multiple schema definitions. Those schema definitions are merged when the [`toString`](#tostring) API is executed.

## What happens when the same type definitions exist in multiple schemas?

They are merged into a single type definition. This is how the `type Query`, `type Mutation` and `type Subscription` can be defined in multiple microservice schemas and merged into a single GraphQL schema. For example:

```js
import { Schemax } from 'graphql-schemax'

const inlineSchema01 = [
'type Project', {
	id: 'ID',
	name: 'String'
},
'type Query', {
	projects: '[Project]'
}]

const inlineSchema02 = [
'type User', {
	id: 'ID',
	first_name: 'String',
	last_name: 'String'
},
'type Project', {
	sku: 'String'
},
'type Query', {
	users: '[User]'
}]

const schema = new Schemax(inlineSchema01, inlineSchema02)

console.log(schema.toString())
```

Outputs:

```js
type Project {
	id: ID
	name: String
	sku: String
}

type Query {
	projects: [Project]
	users: [User]
}

type User {
	id: ID
	first_name: String
	last_name: String
}

schema {
	query: Query
}
```

Notice that both `type Project` and `type Query` are defined twice. They are both merged in the final GraphQL schema.

> __WARNING:__ If the type definitions are not exactly identical, the type are considered different and won't be merged. This means that identical types with different directive won't be merged automatically. To deal with this advanced scenario, use the [`addTypeResolutions`](#addtyperesolutions) API.

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


