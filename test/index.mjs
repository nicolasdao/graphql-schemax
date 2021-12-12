/**
 * Copyright (c) 2019-2021, Cloudless Consulting Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

// To skip a test, either use 'xit' instead of 'it', or 'describe.skip' instead of 'describe'.
// To only run a test, use 'it.only' instead of 'it'.

import { assert } from 'chai'
import { Schemax } from '../src/index.mjs'

const compressString = function(s) { return s.replace(/[\n\r]+/g, '').replace(/[\t\r]+/g, '').replace(/ /g,'') }

describe('Schemax', () => {
	describe('.toString()', () => {
		it('01 - Should compile a schemax object into a standard GraphQL schema string.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				collaborators(where: Input_11294185835!): [Collaborator]
				@aws_cognito_user_pools(cognito_groups: ["Owner"])
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_01293313160): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
			}

			type Mutation {
				createProject(project: Input_1743483650): Project
			}

			input Input_11294185835 {
				name: String
				email: String
			}

			type Collaborator {
				id: ID!
				name: String
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum OrderBy {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_01293313160 {
				by: OrderBy!
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const schema = new Schemax(
				'enum Hello', ['Peter', 'Jacky'],
				'type Project @aws_cognito_user_pools', {
					id: 'ID!',
					name: 'String!',
					description: 'String',
					collaborators: { where: { __required:true, name: 'String', email: 'String' }, ':': [{ __name:'Collaborator', id: 'ID!', name:'String' }] },
					'@aws_cognito_user_pools(cognito_groups: ["Owner"])': null,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name', '__required', '__name:OrderBy'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null
				},
				'type Mutation', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' }
				})

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})	
		it('02 - Should merge multiple schemax into a single valid GraphQL schema.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_12144573852): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
				users(where: Input_11955503210): [User]
			}

			type Mutation {
				createProject(project: Input_1743483650): Project
				createUser(user: Input_1743483650): User
			}

			type User {
				id: ID!
				name: String!
				description: String
				first_name: String
				last_name: String
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum Enum_11091652180 {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_12144573852 {
				by: Enum_11091652180
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const baseResource = {
				id: 'ID!',
				name: 'String!',
				description: 'String'
			}

			const randomSchemax = [
				'enum Hello', ['Peter', 'Jacky']
			]

			const productSchemax = [
				'type Project @aws_cognito_user_pools', {
					...baseResource,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null,
				},
				'type Mutation', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' },
				}
			]

			const userSchemax = [
				'type User', {
					...baseResource,
					first_name: 'String',
					last_name: 'String'
				},
				'type Query', {
					users: { where: { id: 'ID', name: 'String' }, ':': '[User]' }
				},
				'type Mutation', {
					createUser: { user: { name:'String!', description:'String' }, ':': 'User' }
				}
			]

			const schema = new Schemax(...randomSchemax, ...productSchemax, ...userSchemax)

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})
		it('03 - Should support directives.', () => {
			const expected = compressString(`
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
			}`)

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

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})
		it('04 - Should support constructor that accept an array schema definitions.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				collaborators(where: Input_11294185835!): [Collaborator]
				@aws_cognito_user_pools(cognito_groups: ["Owner"])
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_01293313160): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
			}

			type Mutation {
				createProject(project: Input_1743483650): Project
			}

			input Input_11294185835 {
				name: String
				email: String
			}

			type Collaborator {
				id: ID!
				name: String
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum OrderBy {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_01293313160 {
				by: OrderBy!
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const schema = new Schemax([
				'enum Hello', ['Peter', 'Jacky'],
				'type Project @aws_cognito_user_pools', {
					id: 'ID!',
					name: 'String!',
					description: 'String',
					collaborators: { where: { __required:true, name: 'String', email: 'String' }, ':': [{ __name:'Collaborator', id: 'ID!', name:'String' }] },
					'@aws_cognito_user_pools(cognito_groups: ["Owner"])': null,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name', '__required', '__name:OrderBy'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null
				},
				'type Mutation', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' }
				}])

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})	
		it('05 - Should support constructor that accept a mix of array schema definitions and inline schema definitions.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_12144573852): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
				users(where: Input_11955503210): [User]
			}

			type Mutation {
				createProject(project: Input_1743483650): Project
				createUser(user: Input_1743483650): User
			}

			type User {
				id: ID!
				name: String!
				description: String
				first_name: String
				last_name: String
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum Enum_11091652180 {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_12144573852 {
				by: Enum_11091652180
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const baseResource = {
				id: 'ID!',
				name: 'String!',
				description: 'String'
			}

			const randomSchemax = [
				'enum Hello', ['Peter', 'Jacky']
			]

			const productSchemax = [
				'type Project @aws_cognito_user_pools', {
					...baseResource,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null,
				},
				'type Mutation', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' },
				}
			]

			const userSchemax = [
				'type User', {
					...baseResource,
					first_name: 'String',
					last_name: 'String'
				},
				'type Query', {
					users: { where: { id: 'ID', name: 'String' }, ':': '[User]' }
				},
				'type Mutation', {
					createUser: { user: { name:'String!', description:'String' }, ':': 'User' }
				}
			]

			const schema = new Schemax(randomSchemax, productSchemax, ...userSchemax)

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})	
		it('06 - Should support merging same types by keeping the longest when merging multiple schemax into a single valid GraphQL schema.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_12144573852): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
				users(where: Input_11955503210): [User]
			}

			type User {
				id: ID!
				name: String!
				description: String
				first_name: String
				last_name: String
			}

			type Mutation @aws_cognito_user_pools {
				createProject(project: Input_1743483650): Project
				createUser(user: Input_1743483650): User
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum Enum_11091652180 {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_12144573852 {
				by: Enum_11091652180
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const baseResource = {
				id: 'ID!',
				name: 'String!',
				description: 'String'
			}

			const randomSchemax = [
				'enum Hello', ['Peter', 'Jacky']
			]

			const productSchemax = [
				'type Project @aws_cognito_user_pools', {
					...baseResource,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null,
				},
				'type Mutation @aws_cognito_user_pools', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' },
				}
			]

			const userSchemax = [
				'type User', {
					...baseResource,
					first_name: 'String',
					last_name: 'String'
				},
				'type Query', {
					users: { where: { id: 'ID', name: 'String' }, ':': '[User]' }
				},
				'type Mutation', {
					createUser: { user: { name:'String!', description:'String' }, ':': 'User' }
				}
			]

			const schema = new Schemax(...randomSchemax, ...productSchemax, ...userSchemax)
			schema.addTypeResolutions([
				{ def: /^type Mutation(\s|$)/, keepLongest:true }
			])

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})
		it('07 - Should support renaming types when merging multiple schemax into a single valid GraphQL schema.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_12144573852): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
				users(where: Input_11955503210): [User]
			}

			type User @aws_auth {
				id: ID!
				name: String!
				description: String
				first_name: String
				last_name: String
			}

			type Mutation @aws_cognito_user_pools {
				createProject(project: Input_1743483650): Project
				createUser(user: Input_1743483650): User
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum Enum_11091652180 {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_12144573852 {
				by: Enum_11091652180
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const baseResource = {
				id: 'ID!',
				name: 'String!',
				description: 'String'
			}

			const randomSchemax = [
				'enum Hello', ['Peter', 'Jacky']
			]

			const productSchemax = [
				'type Project @aws_cognito_user_pools', {
					...baseResource,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null,
				},
				'type Mutation @aws_cognito_user_pools', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' },
				}
			]

			const userSchemax = [
				'type User', {
					...baseResource,
					first_name: 'String',
					last_name: 'String'
				},
				'type Query', {
					users: { where: { id: 'ID', name: 'String' }, ':': '[User]' }
				},
				'type Mutation', {
					createUser: { user: { name:'String!', description:'String' }, ':': 'User' }
				}
			]

			const schema = new Schemax(...randomSchemax, ...productSchemax, ...userSchemax)
			schema.addTypeResolutions([
				{ def: 'type User', to: 'type User @aws_auth' },
				{ def: /^type Mutation(\s|$)/, keepLongest:true }
			])

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})
		it('08 - Should support merging same types by keeping the shortest when merging multiple schemax into a single valid GraphQL schema.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_12144573852): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
				users(where: Input_11955503210): [User]
			}

			type User {
				id: ID!
				name: String!
				description: String
				first_name: String
				last_name: String
			}

			type Mutation {
				createProject(project: Input_1743483650): Project
				createUser(user: Input_1743483650): User
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum Enum_11091652180 {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_12144573852 {
				by: Enum_11091652180
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const baseResource = {
				id: 'ID!',
				name: 'String!',
				description: 'String'
			}

			const randomSchemax = [
				'enum Hello', ['Peter', 'Jacky']
			]

			const productSchemax = [
				'type Project @aws_cognito_user_pools', {
					...baseResource,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null,
				},
				'type Mutation @aws_cognito_user_pools', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' },
				}
			]

			const userSchemax = [
				'type User', {
					...baseResource,
					first_name: 'String',
					last_name: 'String'
				},
				'type Query', {
					users: { where: { id: 'ID', name: 'String' }, ':': '[User]' }
				},
				'type Mutation', {
					createUser: { user: { name:'String!', description:'String' }, ':': 'User' }
				}
			]

			const schema = new Schemax(...randomSchemax, ...productSchemax, ...userSchemax)
			schema.addTypeResolutions([
				{ def: /^type Mutation(\s|$)/, keepShortest:true }
			])

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})
		it('09 - Should support merging same types with a custom reducer when merging multiple schemax into a single valid GraphQL schema.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_12144573852): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
				users(where: Input_11955503210): [User]
			}

			type User {
				id: ID!
				name: String!
				description: String
				first_name: String
				last_name: String
			}

			type Mutation @aws_cognito_user_pools @aws_auth {
				createProject(project: Input_1743483650): Project
				createUser(user: Input_1743483650): User
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum Enum_11091652180 {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_12144573852 {
				by: Enum_11091652180
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const baseResource = {
				id: 'ID!',
				name: 'String!',
				description: 'String'
			}

			const randomSchemax = [
				'enum Hello', ['Peter', 'Jacky']
			]

			const productSchemax = [
				'type Project @aws_cognito_user_pools', {
					...baseResource,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null,
				},
				'type Mutation @aws_cognito_user_pools', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' },
				}
			]

			const userSchemax = [
				'type User', {
					...baseResource,
					first_name: 'String',
					last_name: 'String'
				},
				'type Query', {
					users: { where: { id: 'ID', name: 'String' }, ':': '[User]' }
				},
				'type Mutation @aws_auth', {
					createUser: { user: { name:'String!', description:'String' }, ':': 'User' }
				}
			]

			const schema = new Schemax(...randomSchemax, ...productSchemax, ...userSchemax)
			schema.addTypeResolutions([
				{ 
					def: /^type Mutation(\s|$)/, 
					reduce:(oldType, newType, context) => {
						const attributes = newType.replace('type Mutation', '').split(' ').filter(x => x)
						if (!context.attributes)
							context.attributes = new Set(attributes)
						else
							attributes.forEach(a => context.attributes.add(a))

						const attrs = Array.from(context.attributes)
						return attrs.length ? `type Mutation ${attrs.join(' ')}` : 'type Mutation'
					}
				}
			])

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})
		it('10 - Should support custom names on enums', () => {
			const expected = compressString(`
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
			}`)

			const schema = [
				'type Query', {
					products:{ type:['car','home','furniture','__name:ProductTypeEnum'], ':':{ name:'String' } }
				}
			]

			assert.equal(compressString(new Schemax(schema).toString()), expected)
		})
		it('11 - Should support required anonymous enums', () => {
			const expected = compressString(`
			type Query {
				products(type: ProductTypeEnum!): Type_12078318863
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
			}`)

			const schema = [
				'type Query', {
					products:{ type:['car','home','furniture','__name:ProductTypeEnum','__required'], ':':{ name:'String' } }
				}
			]

			assert.equal(compressString(new Schemax(schema).toString()), expected)
		})
		it('12 - Should support array of anonymous enums', () => {
			const expected = compressString(`
			type Query {
				products(type: [ProductTypeEnum]!): Type_12078318863
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
			}`)

			const schema = [
				'type Query', {
					products:{ type:[['car','home','furniture','__name:ProductTypeEnum','__required']], ':':{ name:'String' } }
				}
			]

			assert.equal(compressString(new Schemax(schema).toString()), expected)
		})
		it('13 - Should support nested complex objects', () => {
			const expected = compressString(`
			type Folder {
				id: ID!
			}

			type Query {
				folders(where: WhereInput): [FoldersOutputType]
			}

			enum UnitEnum {
				gb
				kb
				mb
			}

			input SizeInput {
				unit: UnitEnum
				value: Float
			}

			input FolderSearchInput {
				id: ID
				name: String
				recursive: Boolean
				size: SizeInput
			}

			input WhereInput {
				id: ID
				name: String
				folder: FolderSearchInput
				team: FolderSearchInput
			}

			enum TypeEnum {
				recursive
				standard
			}

			type RelationType {
				parent: Boolean
			}

			type CursorType {
				start: Int
				end: Int
				type: TypeEnum
				relation: RelationType
			}

			enum AccessEnum {
				private
				public
			}

			type FoldersOutputType {
				cursor: CursorType
				data: [Folder]
				type: AccessEnum
			}

			schema {
				query: Query
			}`)

			const FolderSearch = {
				id: 'ID', 
				name: 'String',
				recursive: 'Boolean',
				size: {
					unit:['kb','mb','gb','__name:UnitEnum'],
					value:'Float',
					__name:'SizeInput'
				},
				__name:'FolderSearchInput'
			}

			const schema = [
				'type Folder', {
					id:'ID!'
				},
				'type Query', {
					folders:{ where: { id:'ID', name:'String', folder:FolderSearch, team:FolderSearch, __name:'WhereInput' }, ':':[{
						cursor:{ start:'Int', end:'Int', type:['recursive','standard','__name:TypeEnum'], relation:{ parent:'Boolean', __name:'RelationType' }, __name:'CursorType' },
						data:'[Folder]',
						type:['private', 'public','__name:AccessEnum'],
						__name:'FoldersOutputType'
					}] }
				}
			]

			// console.log(new Schemax(schema).toString())
			assert.equal(compressString(new Schemax(schema).toString()), expected)
		})
		it('14 - Should support nested complex objects in fields', () => {
			const expected = compressString(`
			type Folder {
				id: ID!
				subFolders(where: WhereSubFolderInput): [Folder]
			}

			type Query {
				folders(where: WhereInput): [FoldersOutputType]
			}

			input WhereSubFolderInput {
				id: ID
				name: String
			}

			enum UnitEnum {
				gb
				kb
				mb
			}

			input SizeInput {
				unit: UnitEnum
				value: Float
			}

			input FolderSearchInput {
				id: ID
				name: String
				recursive: Boolean
				size: SizeInput
			}

			input WhereInput {
				id: ID
				name: String
				folder: FolderSearchInput
				team: FolderSearchInput
			}

			enum TypeEnum {
				recursive
				standard
			}

			type RelationType {
				parent: Boolean
			}

			type CursorType {
				start: Int
				end: Int
				type: TypeEnum
				relation: RelationType
			}

			enum AccessEnum {
				private
				public
			}

			type FoldersOutputType {
				cursor: CursorType
				data: [Folder]
				type: AccessEnum
			}

			schema {
				query: Query
			}`)

			const FolderSearch = {
				id: 'ID', 
				name: 'String',
				recursive: 'Boolean',
				size: {
					unit:['kb','mb','gb','__name:UnitEnum'],
					value:'Float',
					__name:'SizeInput'
				},
				__name:'FolderSearchInput'
			}

			const schema = [
				'type Folder', {
					id:'ID!',
					subFolders: { where:{ id:'ID', name:'String', __name:'WhereSubFolderInput' }, ':':'[Folder]' }
				},
				'type Query', {
					folders:{ where: { id:'ID', name:'String', folder:FolderSearch, team:FolderSearch, __name:'WhereInput' }, ':':[{
						cursor:{ start:'Int', end:'Int', type:['recursive','standard','__name:TypeEnum'], relation:{ parent:'Boolean', __name:'RelationType' }, __name:'CursorType' },
						data:'[Folder]',
						type:['private', 'public','__name:AccessEnum'],
						__name:'FoldersOutputType'
					}] }
				}
			]

			// console.log(new Schemax(schema).toString())
			assert.equal(compressString(new Schemax(schema).toString()), expected)
		})
		it('15 - Should support required anonynous array types', () => {

			const expected = compressString(`
			type Mutation {
				invite(users: [UserInviteInput!]!): Message
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
			}`)

			const schema = [
				'type Mutation', {
					invite: { 
						users:[{ 
							id:'ID', 
							email:'String', 
							roles:[['admin','writer','reader','__required','__noempty','__name:RoleEnum']],
							__required:true, 
							__noempty:true, 
							__name:'UserInviteInput' 
						}],
						':':{ message:'String', __name:'Message' } }
				}
			]

			// console.log(new Schemax(schema).toString())
			assert.equal(compressString(new Schemax(schema).toString()), expected)
		})
		it('16 - Should support for shortcuts \'!\', \'!0\' and \'#\' to respectively replace \'__required\', \'__noempty\', and \'__name\'', () => {

			const expected = compressString(`
			type Mutation {
				invite(users: [UserInviteInput!]!): Message
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
			}`)

			const schema = [
				'type Mutation', {
					invite: { 
						users:[{ 
							id:'ID', 
							email:'String', 
							roles:[['admin','writer','reader','!','!0','#RoleEnum']],
							'!': true, 
							'!0': true, 
							'#': 'UserInviteInput' 
						}],
						':':{ message:'String', '#':'Message' } }
				}
			]

			// console.log(new Schemax(schema).toString())
			assert.equal(compressString(new Schemax(schema).toString()), expected)
		})
		it('17 - Should fail when invalid enums are defined', () => {
			const schema = [
				'type Mutation', {
					invite: { 
						users:[{ 
							id:'ID', 
							email:'String', 
							roles:[['admin!','writer','reader','__required','__noempty','__name:RoleEnum']],
							__required:true, 
							__noempty:true, 
							__name:'UserInviteInput' 
						}],
						':':{ message:'String', __name:'Message' } }
				}
			]

			let error
			try {
				const data = new Schemax(schema).toString()
				if (data)
					error = null	
			} catch(err) {
				error = err 
			}

			assert.isOk(error)
			assert.equal(error.message, 'Invalid enum \'admin!\'. Enums can only have letters, numbers, or underscores, and the first character can\'t be a number.')

			const schema2 = [
				'type Mutation', {
					invite: { 
						users:[{ 
							id:'ID', 
							email:'String', 
							roles:[['admin','writer:hello','reader','__required','__noempty','__name:RoleEnum']],
							__required:true, 
							__noempty:true, 
							__name:'UserInviteInput' 
						}],
						':':{ message:'String', __name:'Message' } }
				}
			]

			let error2
			try {
				const data = new Schemax(schema2).toString()
				if (data)
					error2 = null	
			} catch(err) {
				error2 = err 
			}

			assert.isOk(error2)
			assert.equal(error2.message, 'Invalid enum \'writer:hello\'. Enums can only have letters, numbers, or underscores, and the first character can\'t be a number.')
		})
	})
	describe('.add()', () => {
		it('01 - Should merge multiple schemax into a single valid GraphQL schema.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_12144573852): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
				users(where: Input_11955503210): [User]
			}

			type Mutation {
				createProject(project: Input_1743483650): Project
				createUser(user: Input_1743483650): User
			}

			type User {
				id: ID!
				name: String!
				description: String
				first_name: String
				last_name: String
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum Enum_11091652180 {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_12144573852 {
				by: Enum_11091652180
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const baseResource = {
				id: 'ID!',
				name: 'String!',
				description: 'String'
			}

			const randomSchemax = [
				'enum Hello', ['Peter', 'Jacky']
			]

			const productSchemax = [
				'type Project @aws_cognito_user_pools', {
					...baseResource,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null,
				},
				'type Mutation', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' },
				}
			]

			const userSchemax = [
				'type User', {
					...baseResource,
					first_name: 'String',
					last_name: 'String'
				},
				'type Query', {
					users: { where: { id: 'ID', name: 'String' }, ':': '[User]' }
				},
				'type Mutation', {
					createUser: { user: { name:'String!', description:'String' }, ':': 'User' }
				}
			]

			const schema = new Schemax(...randomSchemax)
			schema.add(...productSchemax)
			schema.add(...userSchemax)

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})
		it('02 - Should support constructor that accept a mix of array schema definitions and inline schema definitions.', () => {
			const expected = compressString(`
			enum Hello {
				Jacky
				Peter
			}

			type Project @aws_cognito_user_pools {
				id: ID!
				name: String!
				description: String
				create_date: String!
				update_date: String @aws_api_key
				delete_date: String
				last_commit_date: String
				@aws_api_key
			}

			type Query {
				projects(where: Input_11955503210, order: Input_12144573852): Type_1850756101
				@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])
				users(where: Input_11955503210): [User]
			}

			type Mutation {
				createProject(project: Input_1743483650): Project
				createUser(user: Input_1743483650): User
			}

			type User {
				id: ID!
				name: String!
				description: String
				first_name: String
				last_name: String
			}

			input Input_11955503210 {
				id: ID
				name: String
			}

			enum Enum_11091652180 {
				create_date
				name
			}

			enum Enum_1894885946 {
				asc
				desc
			}

			input Input_12144573852 {
				by: Enum_11091652180
				dir: Enum_1894885946
			}

			type Type_1850756101 {
				count: Int
				data: [Project]
				cursor: ID
			}

			input Input_1743483650 {
				name: String!
				description: String
			}

			schema {
				query: Query
				mutation: Mutation
			}`)

			const baseResource = {
				id: 'ID!',
				name: 'String!',
				description: 'String'
			}

			const randomSchemax = [
				'enum Hello', ['Peter', 'Jacky']
			]

			const productSchemax = [
				'type Project @aws_cognito_user_pools', {
					...baseResource,
					create_date: 'String!',
					update_date: 'String @aws_api_key',
					delete_date: 'String',
					last_commit_date: 'String',
					'@aws_api_key': null
				},
				'type Query', {
					projects: { where: { id: 'ID', name: 'String' }, order: { by: ['create_date', 'name'], dir: ['asc', 'desc'] }, ':': {
						count: 'Int',
						data: '[Project]',
						cursor: 'ID'
					}},
					'@aws_api_key @aws_cognito_user_pools(cognito_groups: ["Bloggers", "Readers"])': null,
				},
				'type Mutation', {
					createProject: { project: { name:'String!', description:'String' }, ':': 'Project' },
				}
			]

			const userSchemax = [
				'type User', {
					...baseResource,
					first_name: 'String',
					last_name: 'String'
				},
				'type Query', {
					users: { where: { id: 'ID', name: 'String' }, ':': '[User]' }
				},
				'type Mutation', {
					createUser: { user: { name:'String!', description:'String' }, ':': 'User' }
				}
			]

			const schema = new Schemax(...randomSchemax)
			schema.add(productSchemax, userSchemax)

			// console.log(schema.toString())
			assert.equal(compressString(schema.toString()), expected)
		})
	})
})









