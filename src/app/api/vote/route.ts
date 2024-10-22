import {
  ActionGetResponse,
  ACTIONS_CORS_HEADERS,
  ActionPostRequest,
  createPostResponse,
} from '@solana/actions';
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Transaction,
} from '@solana/web3.js';
import { Voting } from '@/../anchor/target/types/voting';
import { Program, BN } from '@coral-xyz/anchor';

const IDL = require('@/../anchor/target/idl/voting.json');

export const OPTIONS = GET;

//Step 1- When using blinks we need a Get req to get the Metada. Icon Title lablel description and label are required
// Links is option, Here we use it cause we want 2 "sub actions/ 2 votes".
//Step 2 - Make a POST request so that when the use clicks on the action a request is posted to the Blockchain

export async function GET(request: Request) {
  const actionMetada: ActionGetResponse = {
    icon: 'https://www.foodrepublic.com/img/gallery/the-ingredient-to-check-for-before-buying-generic-peanut-butter/intro-1704194820.jpg',
    title: 'Vote for you favorite type o peanut butter.',
    description: 'Vote between crunchy and smooth peanut butter.',
    label: 'Vote',
    links: {
      actions: [
        {
          type: 'post',
          label: 'Vote for Crunchy',
          href: '/api/vote?candidate=Crunchy',
        },
        {
          type: 'post',
          label: 'Vote for Smooth',
          href: '/api/vote?candidate=Smooth',
        },
      ],
    },
  };

  return Response.json(actionMetada, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
  //First lets grab the selected candidate from params
  const url = new URL(request.url);
  const candidate = url.searchParams.get('candidate');

  if (candidate != 'Crunchy' && candidate != 'Smooth') {
    return new Response('Invalid Candidate', {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  //check code. The blink is timing out and the tx is not going through

  //Now lets connect to BlockChain and get the program we need
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const program: Program<Voting> = new Program(IDL, { connection });

  //Get the body with the metada
  const body: ActionPostRequest = await request.json();
  let voter;

  //get the public key of the wallet that is voting
  try {
    voter = new PublicKey(body.account);
  } catch (e) {
    return new Response('Invalid Account', {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  // Now we need to make the instructions for the transaction
  const instruction: TransactionInstruction = await program.methods
    .vote(candidate, new BN(1))
    .accounts({ signer: voter })
    .instruction();

  //Finally we need to get a block hash
  const blockhash = await connection.getLatestBlockhash();

  //We are ready to make out transaction
  const transaction = new Transaction({
    feePayer: voter,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  }).add(instruction);

  console.log(transaction);

  const response = await createPostResponse({
    fields: {
      transaction: transaction,
      type: 'transaction',
    },
  });

  console.log(response);

  return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
}
