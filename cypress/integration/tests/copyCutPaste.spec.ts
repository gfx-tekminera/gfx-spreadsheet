import { visit } from '../common/visit';
import { Utilities } from '../common/utils';
import { DATA, COLUMNS } from '../../../src/App';

const INVALID_CLASS_NAME = "rg-invalid";
const utils = new Utilities(COLUMNS);

context('Copy-Cut-Paste Spreadsheet', () => {
  beforeEach(() => {
    visit();
  });

  // TODO: populate tests
  it('should spreadsheet', () => {
    utils.getSpreadsheetCell('name', 2).should('not.have.class', INVALID_CLASS_NAME);
    utils.getSpreadsheetCell('name', 2).should('contain', 'yeye');
  });
});
