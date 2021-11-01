

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
 * @param  {Object}	body					e.g., { id: 'ID!', name: 'String': '@aws_api_key': null, __required:true, __name:'Project' } or ['asc', 'desc']
 * 
 * @return {Object}	output
 * @return {Object}		.dependencies[id]	where 'id' could be 'Input_3123213213' and the value 'input Input_3123213213 { id: ID name: String }''
 * @return {String}		.name				Value extracted from the '__name' property.
 * @return {Boolean}	.required			Value extracted from the '__required' property.
 * @return {Boolean}	.isArray			
 * @return {String}		.body				e.g., '{ id: ID! name: String @aws_api_key }'
 */
const _compileBody = (body, indent='') => {
	if (!body)
		throw new Error('\'body\' is required.')
	if (typeof(body) != 'object')
		throw new Error(`'body' must be an object. Found '${typeof(body)}' instead.`)

	indent = (indent||'')+'\t'

	let bodyString = '', 
		dependencies = {}, 
		name, 
		required = false,
		isArray = false

	let _body = body
	if (Array.isArray(body) && _body.length == 1 && typeof(_body[0]) == 'object') {
		_body = _body[0]
		isArray = true
	}

	if (Array.isArray(_body)) {
		const enums = _body.filter(x => x && x != '__required' && x.indexOf('__name') != 0)
		if (!enums.length) 
			throw new Error('Invalid \'body\'. Array cannot be empty.')
		if (enums.some(x => typeof(x) != 'string'))
			throw new Error('Invalid \'body\' item. When \'body\' is an array, all items must be strings.')
		required = _body.some(x => x == '__required')
		const enumsName = _body.find(x => x && x.indexOf('__name') == 0)
		if (enumsName)
			name = (enumsName.match(/:(.*?)$/)||[])[1] || ''
		bodyString = indent + enums.sort((a,b) => a<b?-1:1).join(`\n${indent}`) + '\n'
	} else {
		const fields = Object.keys(_body)
		const l = fields.length
		if (!l)
			throw new Error('\'body\' must be an object with at least one property.')

		for (let i=0;i<l;i++) {
			const field = fields[i]
			const fieldType = _body[field]
			const t = Array.isArray(fieldType) ? 'array' : typeof(fieldType)
			if (field.indexOf('__') == 0) {
				if (field == '__name')
					name = fieldType
				else if (field == '__required')
					required = fieldType
			} else if (!fieldType)
				bodyString += `${indent}${field}\n`
			else if (t == 'string')
				bodyString += `${indent}${field}: ${fieldType}\n`
			else if (t == 'object') { // Example: { where:{ id:'ID', name:'String' }, ':': '[Product]' } -> products(where: 'I_3123213213'): [Product]
				const signatureArgs = Object.keys(fieldType)
				const lastArg = signatureArgs.slice(-1)[0]
				if (lastArg != ':')
					throw new Error(`Last object's property in field '${field}' must be ':'. Found ${lastArg} instead.`)

				let signature = ''
				for (let j=0;j<signatureArgs.length;j++) {
					const arg = signatureArgs[j]
					const argValue = fieldType[arg]
					const argValueType = typeof(argValue)
					if (arg == ':') {
						if (signature)
							signature = `(${signature})`
						if (!argValue)
							throw new Error(`Missing return type in field '${field}'.`)
						if (argValueType == 'string')
							bodyString += `${indent}${field}${signature}: ${argValue}\n`
						else if (argValueType == 'object') {
							const returnType = _compileBody(argValue)
							const newTypeName = returnType.name || `Type_${_getHashSuffix(returnType.body)}`.replace('-', '_')
							const brackets = returnType.isArray ? ['[',']'] : ['','']
							dependencies = { 
								...dependencies, 
								...returnType.dependencies,
								[newTypeName]: `type ${newTypeName} ${returnType.body}`
							}
							bodyString += `${indent}${field}${signature}: ${brackets[0]}${newTypeName}${brackets[1]}${returnType.required ? '!' : ''}\n`
						} else 
							throw new Error(`Unsupported return type in field '${field}'. Supported types are 'string' and 'object'. Found '${argValueType}' instead.`)
					} else {
						if (!argValue)
							throw new Error(`Missing type on argument '${arg}' in field '${field}'.`)
						const sep = signature ? ', ' : ''
						if (argValueType == 'string')
							signature += `${sep}${arg}: ${argValue}`
						else if (argValueType == 'object') {
							const returnType = _compileBody(argValue)
							const newTypeName = returnType.name || `Input_${_getHashSuffix(returnType.body)}`.replace('-', '_')
							const brackets = returnType.isArray ? ['[',']'] : ['','']
							dependencies = { 
								...dependencies, 
								...returnType.dependencies,
								[newTypeName]: `input ${newTypeName} ${returnType.body}`
							}
							signature += `${sep}${arg}: ${brackets[0]}${newTypeName}${brackets[1]}${returnType.required ? '!' : ''}`
						} else if (argValueType == 'array') {
							const returnType = _compileBody(argValue)
							const newTypeName = returnType.name || `Enum_${_getHashSuffix(returnType.body)}`.replace('-', '_')
							dependencies = { 
								...dependencies, 
								...returnType.dependencies,
								[newTypeName]: `enum ${newTypeName} ${returnType.body}`
							}
							signature += `${sep}${arg}: ${newTypeName}${returnType.required ? '!' : ''}`
						} else 
							throw new Error(`Unsupported return type in field '${field}'. Supported types are 'string' and 'object'. Found '${argValueType}' instead.`)
					}
				}
			} else if (t == 'array') { 
				const returnType = _compileBody(fieldType)
				const newTypeName = returnType.name || `Enum_${_getHashSuffix(returnType.body)}`.replace('-', '_')
				dependencies = { 
					...dependencies, 
					...returnType.dependencies,
					[newTypeName]: `enum ${newTypeName} ${returnType.body}`
				}
				bodyString += `${indent}${field}: ${newTypeName}${returnType.required ? '!' : ''}\n`
			} else
				throw new Error(`Field '${field}' must be null, a string or an object. Found '${t}' instead.`)
		}	
	}

	return {
		dependencies,
		name,
		required,
		isArray,
		body: `{\n${bodyString}}`
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



