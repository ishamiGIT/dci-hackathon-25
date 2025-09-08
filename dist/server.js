import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
// Create MCP server instance.
export const server = new McpServer({
    name: 'MCP',
    version: '0.1.0',
});
// Register calculator tool.
server.tool('calculator', 'Performs basic arithmetic operations (+, -, *, /, **). Returns the result of the calculation.', {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'power']).describe('The arithmetic operation to perform'),
    operands: z.array(z.number()).min(2).describe('The numbers to operate on')
}, async ({ operation, operands }) => {
    let result;
    switch (operation) {
        case 'add':
            result = operands.reduce((a, b) => a + b, 0);
            break;
        case 'subtract':
            result = operands.reduce((a, b) => a - b);
            break;
        case 'multiply':
            result = operands.reduce((a, b) => a * b, 1);
            break;
        case 'divide':
            result = operands.reduce((a, b) => a / b);
            break;
        case 'power':
            result = operands.reduce((a, b) => Math.pow(a, b));
            break;
        default:
            throw new Error(`Unsupported operation: ${operation}`);
    }
    return {
        content: [
            {
                type: 'text',
                text: String(result)
            }
        ]
    };
});
