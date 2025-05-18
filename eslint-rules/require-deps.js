export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure useEffect/useCallback/useMemo have deps array',
    },
    schema: [],
    messages: {
      missingDeps: '{{name}} is missing a dependency array.',
    },
  },
  create(context) {
    const hookNames = ['useEffect', 'useCallback', 'useMemo']

    return {
      CallExpression(node) {
        const callee = node.callee.name
        if (!hookNames.includes(callee)) return

        const args = node.arguments
        if (args.length < 2 || args[1].type !== 'ArrayExpression') {
          context.report({
            node,
            messageId: 'missingDeps',
            data: { name: callee },
          })
        }
      },
    }
  },
}
