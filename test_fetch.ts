import { getVideoDetails } from './src/lib/api';

async function test() {
  const details = await getVideoDetails('3103838');
  console.log(JSON.stringify(details, null, 2));
}

test();
