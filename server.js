import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { depthLimit } from './utils/depthLimit.js';

import { parse } from 'graphql/language/parser.js';
import { graphql } from 'graphql';
import util from 'util';

import costLimiter from './cost-assesser/cost-limiter.js';
import rateLimiter from './rate-limiter/rate-limiter.js';

// GraphQL schema
const schema = buildSchema(`
    type Query {
        song(id: Int!): Song
        album(id: Int!): Album
        songs(topic: String): [Song]
        albums(topic: String): [Album]
    },
    type Song {
        id: Int
        title: String
        album: String
    }
    type Album {
        id: Int
        title: String
        songs: [String]
    }
`);

const albumData = [
  {
    id: 1,
    title: 'Jackson\'s Greatest Hits',
    songs: ['Slam Poetry', 'Raised By the Streets'],
  },
  {
    id: 2,
    title: 'Jackson\'s Worst Hits',
    songs: ['Banana Loaf', 'Ping Pong Serves'],
  },
];

const songData = [
  {
    id: 1,
    title: 'Slam Poetry',
    album: 'Jackson\'s Greatest Hits',
  },
  {
    id: 2,
    title: 'Raised By the Streets',
    album: 'Jackson\'s Greatest Hits',
  },
];

const getAlbum = (args) => {
  const { id } = args;
  return albumData.filter((album) => album.id === id)[0];
};

const getSong = (args) => {
  const { id } = args;
  return songData.filter((song) => song.id === id)[0];
};

const getCourses = (args) => {
  if (args.topic) {
    const { topic } = args;
    return coursesData.filter((course) => course.topic === topic);
  }
  return coursesData;
};

// Root resolver
const root = {
  album: getAlbum,
  song: getSong,
  songs: getCourses,
};

// function logBody(req, res, next) {
//   console.log('body in logBody: ', req.body)
//   return next();
// }

// Create an express server and a GraphQL endpoint
const app = express();

app.use(express.json())

app.use('/graphql', costLimiter, rateLimiter, graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true,
  // validationRules: [depthLimit(10)],
}));

app.listen(3000, () => console.log('Express GraphQL Server Now Running On localhost:3000/graphql'));

