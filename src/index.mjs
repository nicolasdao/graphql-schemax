import { parse } from 'graphql'

export const parseToAST = parse

export function Schemax(...items) {
	const _typeResolutions = []
	const _items = items.reduce((acc,item) => {
		if (Array.isArray(item) && item.some(x => typeof(x) != 'string'))
			acc.push(...item)
		else
			acc.push(item)
		return acc
	},[])
	
	this.toString = () => {
		return _transpileSchema(_items, _typeResolutions)
	}

	this.add = (...args) => {
		for (let i=0;i<args.length;i++) {
			const item = args[i]
			if (Array.isArray(item) && item.some(x => typeof(x) != 'string'))
				_items.push(...item)
			else
				_items.push(item)
		}
	}

	this.addTypeResolutions = values => _typeResolutions.push(...(values||[]))

	return this
}

/**
 * Compiles and body object into a GraphQL string body.
 * 
 * @param  {Object}		body					e.g., { id: 'ID!', name: 'String': '@aws_api_key': null, __required:true, __name:'Project' } or ['asc', 'desc']
 * @param  {Boolean}	options.nestedBody
 * @param  {String}		options.nestedBodyType
 * 
 * @return {Object}		output
 * @return {Object}			.dependencies[id]	where 'id' could be 'Input_3123213213' and the value 'input Input_3123213213 { id: ID name: String }''
 * @return {String}			.name				Value extracted from the '__name' property.
 * @return {Boolean}		.required			Value extracted from the '__required' property.
 * @return {Boolean}		.isArray
 * @return {String}			.type				e.g., 'input', 'enum', 'type'
 * @return {String}			.body				e.g., '{ id: ID! name: String @aws_api_key }'
 */
const _compileBody = (body, options) => {
	if (!body)
		throw new Error('\'body\' is required.')
	if (typeof(body) != 'object')
		throw new Error(`'body' must be an object. Found '${typeof(body)}' instead.`)

	const { nestedBody, nestedBodyType='input' } = options||{}
	let type = nestedBodyType
	const indent = '\t'

	let bodyString = '', 
		dependencies = {}, 
		name, 
		required = false,
		isArray = false,
		noempty = false

	let _body = body
	if (Array.isArray(body) && _body.length == 1 && typeof(_body[0]) == 'object') {
		_body = _body[0]
		isArray = true
	}

	// ENUM
	if (Array.isArray(_body)) {
		const enums = _body.filter(x => x && x != '__required' && x != '!' && x != '__noempty' && x != '!0' && x.indexOf('__name') != 0 && x.indexOf('#') != 0)
		if (!enums.length) 
			throw new Error('Invalid enum. Array cannot be empty.')
		if (enums.some(x => typeof(x) != 'string'))
			throw new Error('Invalid enum item. When \'body\' is an array, all items must be strings.')
		const invalidEnum = enums.find(e => /[^a-zA-Z0-9_]/.test(e) || /^[0-9]/.test(e))
		if (invalidEnum)
			throw new Error(`Invalid enum '${invalidEnum}'. Enums can only have letters, numbers, or underscores, and the first character can't be a number.`)
		required = _body.some(x => x == '__required' || x == '!')
		noempty = _body.some(x => x == '__noempty' || x == '!0')
		const enumsName = _body.find(x => x && (x.indexOf('__name') == 0 || x.indexOf('#') == 0))
		if (enumsName)
			name = /^#/.test(enumsName) ? enumsName.replace('#','') : (enumsName.match(/:(.*?)$/)||[])[1] || ''
		bodyString = indent + enums.sort((a,b) => a<b?-1:1).join(`\n${indent}`) + '\n'
		type = 'enum'
	} else { // TYPE OR INPUT
		const fields = Object.keys(_body)
		const l = fields.length
		if (!l)
			throw new Error('\'body\' must be an object with at least one property.')

		for (let i=0;i<l;i++) {
			const field = fields[i]
			const fieldBody = _body[field]
			const t = Array.isArray(fieldBody) ? 'array' : typeof(fieldBody)
			const isRequired = field == '__required' || field == '!'
			const isNoEmpty = field == '__noempty' || field == '!0'
			const isAlias = field == '__name' || field.indexOf('#') == 0
			if (field.indexOf('__') == 0 || isRequired || isNoEmpty || isAlias) {
				if (isAlias)
					name = fieldBody
				else if (isRequired)
					required = fieldBody
				else if (isNoEmpty)
					noempty = fieldBody
			} else if (!fieldBody)
				bodyString += `${indent}${field}\n`
			else if (t == 'string')
				bodyString += `${indent}${field}: ${fieldBody}\n`
			else if (t == 'object') { // Example: { where:{ id:'ID', name:'String' }, ':': '[Product]' } -> products(where: 'I_3123213213'): [Product]
				if (nestedBody) {
					const f = _compileField({ field, fieldBody, nestedBodyType, indent })
					dependencies = {
						...dependencies,
						...f.dependencies
					}
					bodyString += f.bodyString
				} else {
					const signatureArgs = Object.keys(fieldBody)
					const lastArg = signatureArgs.slice(-1)[0]
					if (lastArg != ':')
						throw new Error(`Last object's property in field '${field}' must be ':'. Found ${lastArg} instead.`)

					let signature = ''
					for (let j=0;j<signatureArgs.length;j++) {
						const arg = signatureArgs[j]
						const argValue = fieldBody[arg]
						const argValueType = typeof(argValue)
						if (arg == ':') {
							if (signature)
								signature = `(${signature})`
							if (!argValue)
								throw new Error(`Missing return type in field '${field}'.`)
							if (argValueType == 'string')
								bodyString += `${indent}${field}${signature}: ${argValue}\n`
							else if (argValueType == 'object') {
								const f = _compileField({ field, fieldBody:argValue, nestedBodyType:'type', indent, signature })
								dependencies = {
									...dependencies,
									...f.dependencies
								}
								bodyString += f.bodyString
							} else 
								throw new Error(`Unsupported return type in field '${field}'. Supported types are 'string' and 'object'. Found '${argValueType}' instead.`)
						} else {
							if (!argValue)
								throw new Error(`Missing type on argument '${arg}' in field '${field}'.`)

							const sep = signature ? ', ' : ''
							if (argValueType == 'string')
								signature += `${sep}${arg}: ${argValue}`
							else if (argValueType == 'object') {
								const f = _compileField({ field:arg, fieldBody:argValue, nestedBodyType, indent:sep })
								dependencies = {
									...dependencies,
									...f.dependencies
								}
								signature += f.bodyString
							} else if (argValueType == 'array') {
								const f = _compileField({ field:arg, fieldBody:argValue, nestedBodyType:'enum', indent:sep })
								dependencies = {
									...dependencies,
									...f.dependencies
								}
								signature += f.bodyString
							} else 
								throw new Error(`Unsupported return type in field '${field}'. Supported types are 'string' and 'object'. Found '${argValueType}' instead.`)
						}
					}
				}
			} else if (t == 'array') { 
				const f = _compileField({ field, fieldBody, nestedBodyType:'enum', indent })
				dependencies = {
					...dependencies,
					...f.dependencies
				}
				bodyString += f.bodyString
			} else
				throw new Error(`Field '${field}' must be null, a string or an object. Found '${t}' instead.`)
		}	
	}

	return {
		dependencies,
		name,
		type,
		required,
		noempty,
		isArray,
		body: `{\n${bodyString}}`
	}
}

/**
 * 
 * @param  {String} field				e.g., 'user', 'products', 'name', 'email'			
 * @param  {Object} fieldBody			e.g., { name: 'String!', description: 'String' }, [ 'create_date', 'name' ]
 * @param  {String} nestedBodyType		e.g., 'input', 'type', 'enum'		
 * @param  {String} indent				
 * @param  {String} signature			Used for field's argument (e.g., '(where: Input_11294185835!\n)')
 * 					
 * @return {Object} output
 * @return {String}		.bodyString		e.g., 'user: Input_1743483650\n'
 * @return {String}		.dependencies	e.g., { Input_1743483650: 'input Input_1743483650 {\n\tname: String!\n\tdescription: String\n}' }
 */
const _compileField = ({ field, fieldBody, nestedBodyType, indent, signature='' }) => {
	const returnType = _compileBody(fieldBody, { nestedBody:true, nestedBodyType })

	const newTypeName = returnType.name || `${returnType.type.replace(/^./,s => s.toUpperCase())}_${_getHashSuffix(returnType.body)}`.replace('-', '_')
	const brackets = returnType.isArray ? ['[',']'] : ['','']
	const dependencies = { 
		...returnType.dependencies,
		[newTypeName]: `${returnType.type} ${newTypeName} ${returnType.body}`
	}
	const nonEmptyArraySign = brackets[0] == '[' && returnType.noempty ? '!' : ''
	if (signature)
		signature = signature.replace(/\n/g,'')
	const bodyString = `${indent}${field}${signature}: ${brackets[0]}${newTypeName}${nonEmptyArraySign}${brackets[1]}${returnType.required ? '!' : ''}\n`
		
	return {
		dependencies,
		bodyString
	}
}

/**
 * Transpiles a JSON object to a GraphQL string schema.
 * 
 * @param  {[Object]}		items
 * @param  {[Object]}		typeResolutions[]
 * @param  {String|RegExp}		.def
 * @param  {Boolean}			.keepLongest
 * @param  {Boolean}			.keepShortest
 * 
 * @return {String}   graphQLSchema
 */
const _transpileSchema = (items, typeResolutions) => {
	if (!items.length)
		return ''

	const typeResolutionsOn = typeResolutions && typeResolutions.length
	const matchTypeResolutions = typeResolutionsOn 
		? typeResolutions.filter(r => r && r.def).map((r,idx) => {
			const match = typeof(r.def) == 'string' ? v => v == r.def : r.def instanceof RegExp ? v => (v||'').match(r.def) : () => false
			return { ...r, match, id:idx }
		})
		: null

	let schema = '',
		dependencies = {}

	const { mergedItems, matchedKeyResolutionRules } = items.reduce((acc, item, i) => {
		const t = typeof(item)

		if (acc.keyOn) {
			if (!item)
				throw new Error(`Schema item[${i}] cannot be falsy.`)

			if (t != 'string')
				throw new Error(`Schema item[${i}] must be a string (e.g., 'type Product'). Found '${t}' instead.`)
			acc.key = item.trim()
			if (typeResolutionsOn) {
				const rule = matchTypeResolutions.find(r => r.match(acc.key))
				if (rule) {
					if (!acc.matchedKeyResolutionRules[rule.id])
						acc.matchedKeyResolutionRules[rule.id] = [{ key:acc.key, rule }]
					else
						acc.matchedKeyResolutionRules[rule.id].push({ key:acc.key, rule })
				}
			}
		} else {
			if (item && t != 'object')
				throw new Error(`Schema item[${i}] must be an object (e.g., { id: 'ID!', name: 'String' }). Found '${t}' instead.`)
			if (!acc.mergedItems[acc.key])
				acc.mergedItems[acc.key] = item || null
			else if (item)
				acc.mergedItems[acc.key] = { ...acc.mergedItems[acc.key], ...item }
		}

		acc.keyOn = !acc.keyOn
		return acc
	}, { mergedItems:{}, keyOn:true, key:'', matchedKeyResolutionRules:{} })

	for (let [,keys] of Object.entries(matchedKeyResolutionRules)){
		const l = keys.length
		const rule = keys[0].rule
		let obj = {}
		let masterKey = ''
		const reduceContext = {}
		for (let i=0;i<l;i++) {
			const key = keys[i].key
			const body = mergedItems[key] || {}
			obj = { ...obj, ...body }
			if (!masterKey)
				masterKey = key

			if (rule.keepShortest) {
				if (key.length < masterKey.length)
					masterKey = key
			} else if (rule.to)
				masterKey = rule.to
			else if (rule.reduce && typeof(rule.reduce) == 'function')
				masterKey = rule.reduce(masterKey, key, reduceContext)
			else // Default is rule.keepLongest
			if (key.length > masterKey.length)
				masterKey = key

			delete mergedItems[key]
		}

		mergedItems[masterKey] = obj
	}

	let newLine = ''
	for (let [def,body] of Object.entries(mergedItems)) {
		schema += newLine + def

		if (body) { // non-directive
			const compiledItem = _compileBody(body)
			schema += ' ' + compiledItem.body
			dependencies = { ...dependencies, ...compiledItem.dependencies }
		}

		newLine = '\n\n'
	}

	for (const [, anonymousType] of Object.entries(dependencies))
		schema += '\n\n' + anonymousType

	const containsQuery = /type\s+Query(\s|{)/.test(schema)
	const containsMutation = /type\s+Mutation(\s|{)/.test(schema)
	const containsSubscription = /type\s+Subscription(\s|{)/.test(schema)

	if (containsQuery || containsMutation || containsSubscription) {
		schema += '\n\nschema {\n'
		if (containsQuery)
			schema += '\tquery: Query\n'
		if (containsMutation)
			schema += '\tmutation: Mutation\n'
		if (containsSubscription)
			schema += '\tsubscription: Subscription\n'

		schema += '}'
	}	

	// Validate the GraphQL schema
	parse(schema)

	return schema
}

/**
 * Converts a string to a hash number.
 * 
 * @param  {String} str
 * 
 * @return {Number} hash
 */
const _hashCode = str => {
	let hash = 0, i, chr
	if (str.length === 0) 
		return hash
	for (i = 0; i < str.length; i++) {
		chr = str.charCodeAt(i)
		hash = ((hash << 5) - hash) + chr
		hash |= 0 // Convert to 32bit integer
	}
	return hash
}

/**
 * Converts a string to a hash string where negative numbers are prefixed with 0 and positive numbers are prefixed with 1.
 * 
 * @param  {String} str
 * 
 * @return {String} hash
 */
const _getHashSuffix = str => {
	const hash = _hashCode(str)
	return hash >= 0 ? `1${hash}` : `0${hash*-1}`
}



