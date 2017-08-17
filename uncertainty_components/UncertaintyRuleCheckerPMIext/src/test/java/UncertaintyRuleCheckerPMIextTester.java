import java.io.File;

import uk.ac.nactem.uima.test.CasProcessorTester;

public class UncertaintyRuleCheckerPMIextTester {
	public static void main(String[] args) throws Exception {
		System.setProperty("uima.datapath", "resources");
		CasProcessorTester tester = new CasProcessorTester("desc/uk/ac/nactem/uima/UncertaintyRuleCheckerPMIv2.xml");
		tester.setParam("InputFile", "/home/chryssa/PhD/newPMIfiles/clues_rules_PMI2_bionlp.txt");
		File directory =new File("/home/chryssa/PhD/PROPMIXMIs");
		File [] files = directory.listFiles();

		System.out.println("NUMBER OF FILES: "+files.length);

		for(File file : files){
			System.out.println(file.getName());
			tester.addInput(file);
		}
		tester.process();
	}
}
