import { core } from "web3";
import { Web3TxEIP4844Plugin } from "../src";

describe("TemplatePlugin Tests", () => {
  it("should register TokensPlugin plugin on Web3Context instance", () => {
    const web3Context = new core.Web3Context("http://127.0.0.1:8545");
    web3Context.registerPlugin(new Web3TxEIP4844Plugin());
    expect(web3Context.txTypeEIP4844Plugin).toBeDefined();
  });

  describe("TemplatePlugin method tests", () => {
    let consoleSpy: jest.SpiedFunction<typeof global.console.log>;

    let web3Context: Web3;

    beforeAll(() => {
      web3Context = new Web3("http://127.0.0.1:8545");
      web3Context.registerPlugin(new TemplatePlugin());
      consoleSpy = jest.spyOn(global.console, "log").mockImplementation();
    });

    afterAll(() => {
      consoleSpy.mockRestore();
    });

    it("should call TempltyPlugin test method with expected param", () => {
      web3Context.template.test("test-param");
      expect(consoleSpy).toHaveBeenCalledWith("test-param");
    });
  });
});
