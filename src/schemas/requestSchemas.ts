export const assistantRequestSchema = {
    body: {
        type: 'object',
        //required: ['From'],
        properties: {
            Body: { type: 'string', minLength: 0 },
            From: { type: 'string', minLength: 3 },
            NumMedia: { type: 'string', minLength: 0 },
            MediaUrl0: { type: 'string', minLength: 0 },
            MediaContentType0: { type: 'string', minLength: 0 },
            message: { type: 'object' },
            edited_message: { type: 'object' }
        }
    }
}; 