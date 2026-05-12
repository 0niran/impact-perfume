import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'header',
      title: 'Header Navigation',
      type: 'object',
      fields: [
        defineField({
          name: 'mainMenu',
          title: 'Main Menu',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              defineField({
                name: 'title',
                title: 'Menu Title',
                type: 'string'
              }),
              defineField({
                name: 'link',
                title: 'Link',
                type: 'string'
              }),
              defineField({
                name: 'megaMenu',
                title: 'Mega Menu',
                type: 'object',
                fields: [
                  defineField({
                    name: 'enabled',
                    title: 'Show Mega Menu',
                    type: 'boolean',
                    initialValue: false
                  }),
                  defineField({
                    name: 'columns',
                    title: 'Menu Columns',
                    type: 'array',
                    of: [{
                      type: 'object',
                      fields: [
                        defineField({
                          name: 'title',
                          title: 'Column Title',
                          type: 'string'
                        }),
                        defineField({
                          name: 'links',
                          title: 'Links',
                          type: 'array',
                          of: [{
                            type: 'object',
                            fields: [
                              defineField({
                                name: 'title',
                                title: 'Link Title',
                                type: 'string'
                              }),
                              defineField({
                                name: 'url',
                                title: 'URL',
                                type: 'string'
                              })
                            ]
                          }]
                        })
                      ]
                    }]
                  })
                ]
              })
            ]
          }]
        })
      ]
    }),
    defineField({
      name: 'footer',
      title: 'Footer Navigation',
      type: 'object',
      fields: [
        defineField({
          name: 'columns',
          title: 'Footer Columns',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              defineField({
                name: 'title',
                title: 'Column Title',
                type: 'string'
              }),
              defineField({
                name: 'links',
                title: 'Links',
                type: 'array',
                of: [{
                  type: 'object',
                  fields: [
                    defineField({
                      name: 'title',
                      title: 'Link Title',
                      type: 'string'
                    }),
                    defineField({
                      name: 'url',
                      title: 'URL',
                      type: 'string'
                    })
                  ]
                }]
              })
            ]
          }]
        })
      ]
    })
  ],
  preview: {
    prepare() {
      return {
        title: 'Navigation Settings'
      }
    }
  }
})