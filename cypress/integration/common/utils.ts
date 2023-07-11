/// <reference types="cypress" />
import { DataRow } from '../../../src/lib';

type Config = {
  pinToBody: boolean;
};

export class Utilities {
  private config: Config;
  private columns: string[];
  constructor(columns: string[], config?: Partial<Config>) {
    if (config) {
      this.config = Object.assign(this.config, config);
    } else {
      this.config = {
        pinToBody: false,
      };
    }
    this.columns = columns;
  }

  getConfig(): Config {
    return this.config;
  }

  isMacOs(): boolean {
    return Cypress.platform === 'darwin';
  }

  getColumnIndex(name: string): number {
    return this.columns.indexOf(name.toString())
  }

  getSpreadsheetCell(x: keyof DataRow, y: number) {
    const xIndex = this.getColumnIndex(x.toString()) + 1;
    return this.getCell(xIndex, y);
  }

  getCell(x: number, y: number): Cypress.Chainable {
    return cy.get(`[data-cell-colidx=${x}][data-cell-rowidx=${y}]`).eq(0);
  }

  getAllCells(): Cypress.Chainable {
    return cy.get(".rg-cell");
  }

  getCellFocus(): Cypress.Chainable {
    const cell = cy.get(".rg-cell-focus");
    cell.should("exist");
    return cell;
  }

  clickSpreadsheet(x: keyof DataRow, y: number) {
    const xIndex = this.getColumnIndex(x.toString());
    return this.click(xIndex, y);
  }

  click(x: number, y: number): void {
    this.getScrollableElement().trigger("pointerdown", x, y, {
      pointerType: "mouse",
    });
    this.getBody().trigger("pointerup", 0, 0, {
      pointerType: "mouse",
      force: true,
    }); //
  }

  keyDown(
    keyCode: number,
    customEventArgs?: Record<string, unknown>,
    timeout = 200,
    log = true
  ): void {
    const rg = this.getReactGridContent();
    if (customEventArgs !== undefined) {
      rg.trigger("keydown", { ...customEventArgs, keyCode, log, force: true });
    } else {
      rg.trigger("keydown", { keyCode, log, force: true });
    }
    rg.trigger("keyup", { force: true, log });
    cy.wait(timeout, { log });
  }

  selectRange(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    customEventArgs?: Record<string, unknown>,
    log = true
  ) {
    const scrollableElement = this.getScrollableElement();
    scrollableElement.then(($el) => {
      const { offsetLeft, offsetTop } = $el[0];
      if (customEventArgs !== undefined) {
        scrollableElement.trigger("pointerdown", fromX, fromY, {
          log,
          ...customEventArgs,
          pointerType: "mouse",
        });
      } else {
        scrollableElement.trigger("pointerdown", fromX, fromY, {
          log,
          pointerType: "mouse",
        });
      }
      const body = this.getBody();
      body.trigger("pointermove", toX + offsetLeft, toY + offsetTop, {
        log,
        pointerType: "mouse",
      });
      body.trigger("pointerup", toX + offsetLeft, toY + offsetTop, {
        force: true,
        log,
        pointerType: "mouse",
      });
      cy.wait(200);
    });
  }

  private getBody(): Cypress.Chainable {
    return cy.get("body");
  }

  private getScrollableElement(): Cypress.Chainable {
    // TODO is Body correct element for getting scroll and sroll view?
    return this.config.pinToBody
      ? this.getBody()
      : this.getDivScrollableElement();
  }

  private getReactGridContent(): Cypress.Chainable {
    return cy.get(".reactgrid-content");
  }

  private getDivScrollableElement(): Cypress.Chainable {
    return cy.get(".test-grid-container");
  }

}
