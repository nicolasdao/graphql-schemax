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









