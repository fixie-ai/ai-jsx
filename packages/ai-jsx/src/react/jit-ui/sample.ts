import { compile } from '@mdx-js/mdx';

async function main() {

try {
  await compile(`
  Sure, here are the details of your flight reservation:

<Card>
**Flight Number**: ABC123
**Departure Airport**: JFK
**Departure Date**: October 1, 2022
**Departure Time**: 10:00 AM
  `)
} catch (e) {
  console.log('got error', e)
}

}
main().then(() => console.log('done')).catch(e => console.log('error', e));