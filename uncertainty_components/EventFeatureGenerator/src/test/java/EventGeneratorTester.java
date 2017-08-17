import java.io.File;

import uk.ac.nactem.uima.test.CasProcessorTester;


public class EventGeneratorTester {
	public static void main(String[] args) throws Exception {
		System.setProperty("uima.datapath", "resources");
		CasProcessorTester tester = new CasProcessorTester("desc/uk/ac/nactem/uima/EventFeatureGenerator.xml");
		tester.addInput(new File("/home/chryssa/PhD/ACEgenia2/%2Ftmp%2F1680914.txt.xmi"));
		tester.setUseCasVisualDebugger();
		tester.process();
	}
}
