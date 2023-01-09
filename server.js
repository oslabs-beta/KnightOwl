const express = require('express');
const { graphqlHTTP } = require('express-graphql');


const { GraphQLSchema } = require('graphql');
const { GraphQLObjectType } = require('graphql');
const { GraphQLString } = require('graphql');
const { GraphQLList } = require('graphql');
const { GraphQLInt } = require('graphql');
const { GraphQLNonNull } = require('graphql');


const { parse } = require('graphql/language/parser.js');
const { graphql } = require('graphql');
const util = require('util');
const depthLimit = require('./utils/depthLimit.js');

const costLimiter = require('./cost-assesser/cost-limiter.js');
const rateLimiter = require('./rate-limiter/rate-limiter.js');

const authors = [
  { id: 1, name: 'J. K.' },
  { id: 2, name: 'J. R. R.' },
  { id: 3, name: 'Brent Weeks' }
];

const books = [
  { id: 1, name: 'Harry Potter and the Chamber of Secrets', authorId: 1 },
  { id: 2, name: 'Harry Potter and the Prisoner of Azkaban', authorId: 1 },
  { id: 3, name: 'Harry Potter and the Goblet of Fire', authorId: 1 },
  { id: 4, name: 'The Fellowship of the Ring', authorId: 2 },
  { id: 5, name: 'The Two Towers', authorId: 2 },
  { id: 6, name: 'The Return of the King', authorId: 2 },
  { id: 7, name: 'The Way of Shadows', authorId: 3 },
  { id: 8, name: 'Beyond the Shadows', authorId: 3 }
];

const BookType = new GraphQLObjectType({
  name: 'Book',
  description: 'This represents a book written by an author',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt) },
    name: { type: GraphQLNonNull(GraphQLString) },
    authorId: { type: GraphQLNonNull(GraphQLInt) },
    author: {
      type: AuthorType,
      resolve: (book) => {
        return authors.find(author => author.id === book.authorId)
      }
    }
  })
});

const AuthorType = new GraphQLObjectType({
  name: 'Author',
  description: 'This represents a author of a book',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt) },
    name: { type: GraphQLNonNull(GraphQLString) },
    books: {
      type: new GraphQLList(BookType),
      resolve: (author) => {
        return books.filter(book => book.authorId === author.id)
      }
    }
  })
});

const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  description: 'Root Query',
  fields: () => ({
    book: {
      type: BookType,
      description: 'A Single Book',
      args: {
        id: { type: GraphQLInt }
      },
      resolve: (parent, args) => books.find(book => book.id === args.id)
    },
    books: {
      type: new GraphQLList(BookType),
      description: 'List of All Books',
      resolve: () => books
    },
    authors: {
      type: new GraphQLList(AuthorType),
      description: 'List of All Authors',
      resolve: () => authors
    },
    author: {
      type: AuthorType,
      description: 'A Single Author',
      args: {
        id: { type: GraphQLInt }
      },
      resolve: (parent, args) => authors.find(author => author.id === args.id)
    }
  })
});

const schema = new GraphQLSchema({
  query: RootQueryType
});


// Create an express server and a GraphQL endpoint
const app = express();

app.use(express.json())

app.use('/graphql', costLimiter, rateLimiter, graphqlHTTP({
  schema,
  graphiql: true,
  validationRules: [depthLimit(200)],
}));

app.listen(3000, () => console.log('Express GraphQL Server Now Running On localhost:3000/graphql'));
