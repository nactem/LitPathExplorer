import java.io.File;

import uk.ac.nactem.uima.test.CasProcessorTester;


public class UncertaintyFeatureGeneratorTester {
	public static void main(String[] args) throws Exception {
		System.setProperty("uima.datapath", "resources");
		CasProcessorTester tester = new CasProcessorTester("desc/uk/ac/nactem/uima/UncertaintyFeatureGenerator.xml");
		tester.addInput(new File("src/test/resources/PMC2442316.nxml.xmi"));
		tester.setUseCasVisualDebugger();
		tester.process();
	}
}
