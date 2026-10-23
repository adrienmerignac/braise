// Changement d'adresse (#173) : l'export d'une origine est repris à l'identique sur un stockage vide.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';

const T0 = 1_000_000;
const AVANCEE = { gold: 900, xp: 3, level: 5, stage: 9, kills: 1, weapon: 2, armor: 1, luck: 1, last: T0 };
const fichier = texte => ({ target: { files: [{ text: async () => texte }], value: 'x' } });
const sansHorloge = ({ last, ...reste }) => reste;

test('export puis import sur un stockage vide : même partie, message qui guide vers Importer', async () => {
  const ancienne = await lancerJeu({ sauvegarde: AVANCEE });
  let exporte, avant;
  try {
    ancienne.avancer(5_000);
    avant = ancienne.stockage();
    ancienne.clic('export');
    assert.match(ancienne.texte('message'), /Importer/);
    exporte = await ancienne.telechargements.at(-1).blob.text();
  } finally { ancienne.fermer(); }

  const nouvelle = await lancerJeu({ debut: T0 + 60_000 });
  try {
    await nouvelle.el('importfile').onchange(fichier(exporte));
    assert.deepEqual(sansHorloge(nouvelle.stockage()), sansHorloge(avant));
  } finally { nouvelle.fermer(); }
});
