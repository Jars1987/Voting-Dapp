import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { Voting } from '../target/types/voting';
import { BankrunProvider, startAnchor } from 'anchor-bankrun';

const IDL = require('../target/idl/voting.json');

const votingAdress = new PublicKey(
  '5Gcak1bL4fx81gk9nPcHidBG7r6TPPFQckcd3ZEmBMsU'
);

describe('Voting', () => {
  // Configure the client to use the local cluster.
  let context;
  let provider;

  //after deploy on local net we need to use this so we can aceess program from local net
  anchor.setProvider(anchor.AnchorProvider.env());
  let votingProgram = anchor.workspace.Voting as Program<Voting>;

  /* For testing using bannrun:
    let provider: <bankrunProvider>;
    let votingProgram: Program<Voting>; 
    */

  beforeAll(async () => {
    /* context = await startAnchor(
      '',
      [{ name: 'voting', programId: votingAdress }],
      []
    );
    provider = new BankrunProvider(context);
   
    votingProgram = new Program<Voting>(IDL, provider);
     */
  });

  //Tests
  it('InitializePoll', async () => {
    await votingProgram.methods
      .initializePoll(
        new anchor.BN(1),
        'What is your favorite type of of peanut butter?',
        new anchor.BN(0),
        new anchor.BN(1789264470)
      )
      .rpc();

    const [pollAdress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      votingAdress
    );

    const poll = await votingProgram.account.poll.fetch(pollAdress);

    console.log(poll);

    expect(poll.pollId.toNumber()).toEqual(1);
    expect(poll.description).toEqual(
      'What is your favorite type of of peanut butter?'
    );
    expect(poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber());
  });

  it('Initialize Candidate', async () => {
    //Create Crunchy
    await votingProgram.methods
      .initializeCandidate('Crunchy', new anchor.BN(1))
      .rpc();

    await votingProgram.methods
      .initializeCandidate('Smooth', new anchor.BN(1))
      .rpc();

    const [crunchyAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from('Crunchy')], //seed = pool_id + candidate_name
      votingAdress
    );

    const [smoothAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from('Smooth')],
      votingAdress
    );

    const crunchyCandidate = await votingProgram.account.candidate.fetch(
      crunchyAddress
    );
    expect(crunchyCandidate.candidateVotes.toNumber()).toEqual(0);

    const smoothCandidate = await votingProgram.account.candidate.fetch(
      smoothAddress
    );
    expect(smoothCandidate.candidateVotes.toNumber()).toEqual(0);

    console.log(crunchyCandidate, smoothCandidate);
  });

  it('Vote', async () => {
    await votingProgram.methods.vote('Crunchy', new anchor.BN(1)).rpc();

    const [crunchyAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from('Crunchy')], //seed = pool_id + candidate_name
      votingAdress
    );

    const crunchyCandidate = await votingProgram.account.candidate.fetch(
      crunchyAddress
    );

    console.log(crunchyCandidate);
    expect(crunchyCandidate.candidateVotes.toNumber()).toEqual(1);
  });
});
