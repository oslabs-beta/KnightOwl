import arrify from 'arrify';
import { GraphQLError, Kind } from 'graphql';

export const depthLimit = (maxDepth, options = {}, callback = () => {}) => validationContext => {
  try {
    console.log('v-context', validationContext);
    const { definitions } = validationContext.getDocument()
    const fragments = getFragments(definitions)
    const queries = getQueriesAndMutations(definitions)
    const queryDepths = {}
    for (let name in queries) {
      queryDepths[name] = determineDepth(queries[name], fragments, 0, maxDepth, validationContext, name, options)
    }
    callback(queryDepths)
    return validationContext
  } catch (err) {
    console.error(err)
    throw err
  }
}

function getFragments(definitions) {
  return definitions.reduce((map, definition) => {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      map[definition.name.value] = definition
    }
    return map
  }, {})
}

// this will actually get both queries and mutations. we can basically treat those the same
function getQueriesAndMutations(definitions) {
  return definitions.reduce((map, definition) => {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      map[definition.name ? definition.name.value : ''] = definition
    }
    return map
  }, {})
}

function determineDepth(node, fragments, depthSoFar, maxDepth, context, operationName, options) {
  if (depthSoFar > maxDepth) {
    return context.reportError(
      new GraphQLError(`'${operationName}' exceeds maximum operation depth of ${maxDepth}`, [ node ])
    )
  }

  switch (node.kind) {
    case Kind.FIELD:
      // by default, ignore the introspection fields which begin with double underscores
      const shouldIgnore = /^__/.test(node.name.value) || seeIfIgnored(node, options.ignore)

      if (shouldIgnore || !node.selectionSet) {
        return 0
      }
      return 1 + Math.max(...node.selectionSet.selections.map(selection =>
        determineDepth(selection, fragments, depthSoFar + 1, maxDepth, context, operationName, options)
      ))
    case Kind.FRAGMENT_SPREAD:
      return determineDepth(fragments[node.name.value], fragments, depthSoFar, maxDepth, context, operationName, options)
    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION:
    case Kind.OPERATION_DEFINITION:
      return Math.max(...node.selectionSet.selections.map(selection =>
        determineDepth(selection, fragments, depthSoFar, maxDepth, context, operationName, options)
      ))
    default:
      throw new Error('uh oh! depth crawler cannot handle: ' + node.kind)
  }
}

function seeIfIgnored(node, ignore) {
  for (let rule of arrify(ignore)) {
    const fieldName = node.name.value
    switch (rule.constructor) {
      case Function:
        if (rule(fieldName)) {
          return true
        }
        break
      case String:
      case RegExp:
        if (fieldName.match(rule)) {
          return true
        }
        break
      default:
        throw new Error(`Invalid ignore option: ${rule}`)
    }
  }
  return false
}
