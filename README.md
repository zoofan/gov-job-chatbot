# Gov Job/Salary Chatbot

## Overview

A Next.js app that let's user ask natural-language questions above government jobs and salaries

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file with your Anthropic API key:

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000/chat](http://localhost:3000/chat) in your browser to use the app.

5. TO RUN TESTS:

```bash
npm run test
```

## Implementation Notes

The implementation is essentially a RAG (Retrieval-Augmented Generation) pattern.

Upon module load, it creates an inverted index of job data. Essentially, it maps each word to the set of job indices where that word appears.

For every job in the dataset, it extracts words from:

1. Job title
2. Juridiction (uses a token list mapping) ((e.g. sdcounty → ["san", "diego", "sd"]))
3. Job code

Each token gets an entry in the index. The key is the token and the value is a set of job indexes

Upon search, each word in the query is tokenized (with the stop words stripped) and those tokens are used to make a look-up in the inverted index. The jobs are scored by somming up weights. Words that are rare count more.

There is also a salarayMap for quick salray lookups.

ONLY THEN do we make a call the LLM (Claude in this case). We pass in the context with instructions to answer only with the provided data.

OTHER NOTES:

- I've attempted to abstract away specific LLM code to be able to switch providers if needed. You can creaate a new file under providers that implements a simple function signature
- If the latest message returns no results, we fall back to combining the last two messages for a broader search

AI USAGE:
I belive in AI usage for boilerplate aspects.
The following where created with AI:

- The list of 'stop words'
- The error message handling in Anthropics API
- Create the typescript types in types.ts and some funtion return object interfaces
- The jurdisction token mapping list ( sanbernardino: ["san", "bernardino"], etc)
- Some tailwinds styling
- Tests (99 of them!)

NOTES ON SCALE:

- The inverted index is built once on startup and lives in memory. Lookups are fast (hash map!). This scales fine to 10x-100x the current data.
- If we were to scale for much larger data sets (1000x+), loading all the data in memory would be an issue. I'd move the data into a relational db and build the index there.
