package uk.ac.nactem.uima;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.apache.uima.UimaContext;
import org.apache.uima.analysis_component.JCasAnnotator_ImplBase;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.cas.FSIterator;
import org.apache.uima.cas.FeatureStructure;
import org.apache.uima.cas.Type;
import org.apache.uima.jcas.JCas;
import org.apache.uima.jcas.tcas.Annotation;
import org.apache.uima.resource.ResourceInitializationException;
import org.u_compare.shared.syntactic.SyntacticAnnotation;

import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent;
import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuSentence;
import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuToken;
import uk.ac.nactem.uima.cas.bionlpst.Attribute;
import uk.ac.nactem.uima.cas.bionlpst.Event;

public class UncertaintyRuleCheckerPMIext extends JCasAnnotator_ImplBase {

	private ArrayList<String> clueList;

	String clueOUT = null;
	private LinkedHashMap<String, ArrayList<String>> clueMap;

	public static final String PARAM_NAME_INFILE = "InputFile";
	public static final String PARAM_NAME_RULEFILE = "RuleLogFile"; //file to log rule hits
	private Map<String,List<Attribute>> attributeMap;
	private File inFile, ruleFile;

	public void initialize(UimaContext aContext) throws ResourceInitializationException {
		try {
			inFile = new File((String)(aContext.getConfigParameterValue(PARAM_NAME_INFILE)));
			ruleFile = new File((String)(aContext.getConfigParameterValue(PARAM_NAME_RULEFILE)));
			clueList = intitialiseClueList(inFile);
			intitialiseMap(inFile);

		}
		catch (Exception e) {
			throw new ResourceInitializationException(e);
		}
	}



	public void process(JCas jcas) throws AnalysisEngineProcessException {

		attributeMap = new HashMap<String,List<Attribute>>();
		Type attributeType = jcas.getTypeSystem().getType("uk.ac.nactem.uima.cas.bionlpst.Attribute");
		FSIterator<FeatureStructure> attributeIterator =
				jcas.getFSIndexRepository().getAllIndexedFS(attributeType);

		while (attributeIterator.hasNext()) {
			Attribute attribute = (Attribute) attributeIterator.next();
			System.out.println("FIND");
			Event event = (Event) attribute.getAnnotation();
			if (event!=null) {
				String eventID = event.getId();
				List<Attribute> attributeList = attributeMap.get(eventID);
				if (attributeList!=null) {
					attributeList.add(attribute);
				}
				else {
					attributeList = new ArrayList<Attribute>();
					attributeList.add(attribute);
					attributeMap.put(eventID, attributeList);
				}
			}
		}

		FSIterator<Annotation> sentenceIterator = jcas.getAnnotationIndex(EnjuSentence.type).iterator();
		while (sentenceIterator.hasNext()) {
			EnjuSentence sentence = (EnjuSentence) sentenceIterator.next();

			FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);
			while (eventIterator.hasNext()) {
				Event event = (Event) eventIterator.next();

				boolean uncertainty = check4clues(event, jcas,  sentence);
				if(uncertainty){
					System.out.println(event.getId() + "\t" + event.getCoveredText() + "\t" + sentence.getCoveredText());
				}
				Attribute uncertaintyAttribute = null;
				if(attributeMap.containsKey(event.getId())){
					List<Attribute> attributeList = attributeMap.get(event.getId());
					for (Attribute attribute : attributeList){
						if (attribute.getAttributeName().equals("Uncertainty")){
							System.out.println("UN found : "+attribute.getAttributeName());
							uncertaintyAttribute = attribute;
						}
					}
				}
				if(uncertaintyAttribute==null){
					uncertaintyAttribute = new Attribute(jcas);
					uncertaintyAttribute.setAttributeName("Uncertainty");
					uncertaintyAttribute.setAnnotation(event);
					uncertaintyAttribute.addToIndexes(jcas);
				}
				if (uncertainty){
					uncertaintyAttribute.setAttributeValue("Uncertain");
					System.out.println(event.getId() + " = uncertain");
				}
				else{
					if(!uncertaintyAttribute.getAttributeValue().equals("Uncertain"))
						uncertaintyAttribute.setAttributeValue("Certain");
				}
				uncertaintyAttribute.addToIndexes(jcas);
			}//while eventIterator
		}//while sentenceIterator

	}

	private boolean check4clues(Event event, JCas jcas,  EnjuSentence sentence) {
		boolean uncertainty = false;
		try {
			BufferedWriter writer = new BufferedWriter(new FileWriter(ruleFile, true));

			FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);

			while (tokenIterator.hasNext()){
				EnjuToken currToken = (EnjuToken) tokenIterator.next();
				String clueString = currToken.getBase();
				if(clueList.contains(clueString)){
					ArrayList<String> rules = clueMap.get(clueString);
					uncertainty = false;
					for(String rule: rules){
						String [] ruleParts = rule.split("_");

						if(rule.contains("D0")){
							if(ruleParts[2].equals("Arg1")){
								if(!uncertainty)
									uncertainty =  D0Arg1(event, sentence, jcas, currToken);
							}
							else if(ruleParts[2].equals("Arg2")){
								if(!uncertainty)
									uncertainty =  D0Arg2(event, sentence, jcas, currToken);
							}
						}
						else if(rule.contains("D1")){
							if(ruleParts[3].equals("Arg1")){
								if(ruleParts[4].equals("Arg1")){
									if(!uncertainty)
										uncertainty =  D1Arg1Arg1(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
								else if(ruleParts[4].equals("Arg2")){
									if(!uncertainty)
										uncertainty =  D1Arg1Arg2(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
							}
							else if(ruleParts[3].equals("Arg2")){
								if(ruleParts[4].equals("Arg1")){
									if(!uncertainty)
										uncertainty =  D1Arg2Arg1(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
								else if(ruleParts[4].equals("Arg2")){
									if(!uncertainty)
										uncertainty =  D1Arg2Arg2(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
							}
						}
						else if(rule.contains("DW")){
							if(ruleParts[3].equals("Arg1")){
								if(ruleParts[4].equals("Arg2")){
									if(!uncertainty)
										uncertainty =  DWArg1Arg2(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
							}
							else if(ruleParts[3].equals("Arg2")){
								if(ruleParts[4].equals("Arg1")){
									if(!uncertainty)
										uncertainty =  DWArg2Arg1(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}

							}
						}
						else if(rule.contains("DN")){
							if(ruleParts[2].equals("Arg1")){
								if(!uncertainty)
									uncertainty =  DNArg1(event, sentence, jcas, currToken);
							}
							else if(ruleParts[2].equals("Arg2")){
								if(!uncertainty)
									uncertainty =  DNArg2(event, sentence, jcas, currToken);
							}
						}
						if(uncertainty){
							System.out.println("CZrules: " + rule + " - " + clueString + " - " + event.getId());
							writer.write("" + rule + "\t" + clueString + "\t" + event.getId() + "\t" + event.getCoveredText() + "\t" + sentence.getCoveredText());
							writer.newLine();
							writer.close();
							return uncertainty;
						}
					}
				}
			}

		} catch (IOException e) {
			e.printStackTrace();
		}
		return uncertainty;
	}





	private void intitialiseMap(File file) {
		clueMap = new LinkedHashMap<String, ArrayList<String>>();
		try {
			BufferedReader reader = new BufferedReader(new FileReader(file));
			String line;
			while((line = reader.readLine())!=null){
				String clue = line.split("_")[0];
				String rule = line;
				ArrayList<String> ruleList;
				if(!clueMap.containsKey(clue)){
					ruleList = new ArrayList<String>();
				}
				else{
					ruleList = clueMap.get(clue);
				}
				ruleList.add(rule);
				clueMap.put(clue, ruleList);

				if(line.split("_").length>3){
					clue = line.split("_")[1];
					rule = line;
					if(!clueMap.containsKey(clue)){
						ruleList = new ArrayList<String>();
					}
					else{
						ruleList = clueMap.get(clue);
					}
					ruleList.add(rule);
					clueMap.put(clue, ruleList);
				}
			}
			reader.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	private ArrayList<String> intitialiseClueList(File file) {
		ArrayList<String> clueList = new ArrayList<String>();
		try {
			BufferedReader reader = new BufferedReader(new FileReader(file));
			String line;
			while((line = reader.readLine())!=null){
				System.out.println(line);
				clueList.add(line.split("_")[0]);
				if(line.split("_").length>3){
					clueList.add(line.split("_")[1]);
				}
			}
			reader.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return clueList;
	}

	private boolean DNArg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken) {

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();
		EnjuToken previous = null;

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken token = (EnjuToken) tokenIterator.next();
			String tString = token.getBase();
			if(currToken.equals(tString)){
				if(previous!=null){
					if(previous.getBase().toLowerCase().equals("no") || previous.getBase().toLowerCase().equals("not")){
						SyntacticAnnotation arg2Node = token.getArg2();	
						if(!(arg2Node == null)){
							if(semHeadMatches(jcas, arg2Node, triggerBegin, triggerEnd)){
								return true;

							}
						}
						arg2Node = previous.getArg2();	
						if(!(arg2Node == null)){
							if(semHeadMatches(jcas, arg2Node, triggerBegin, triggerEnd)){
								return true;
							}
						}

					}
				}			
			}//if clue found
			previous = token;
		}//while tokenIterator

		return false;
	}


	private boolean DNArg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken) {

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();
		EnjuToken previous = null;

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken token = (EnjuToken) tokenIterator.next();
			String tString = token.getBase();
			if(currToken.equals(tString)){
				if(previous!=null){
					if(previous.getBase().toLowerCase().equals("no") || previous.getBase().toLowerCase().equals("not")){
						SyntacticAnnotation arg1Node = token.getArg1();	
						if(!(arg1Node == null)){
							if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
								return true;
							}
						}
						arg1Node = previous.getArg1();	
						if(!(arg1Node == null)){
							if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
								return true;
							}
						}
					}
				}
			}//if clue found
			previous = token;
		}//while tokenIterator

		return false;
	}


	private boolean DWArg1Arg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		String tString = currToken.getBase();
		if(tString.equals(ruleParts)){
			SyntacticAnnotation arg1Node = currToken.getArg1();
			if(!(arg1Node == null)){
				if(arg1Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
					EnjuConstituent arg1NodeEC = (EnjuConstituent) arg1Node;
					EnjuToken semHeadToken = getSemHeadToken(arg1NodeEC, jcas);
					if(semHeadToken != null){
						String clueCandidate = semHeadToken.getBase().toLowerCase();
						if (ruleParts2.equals(clueCandidate)){
							SyntacticAnnotation secarg2Node = currToken.getArg2();
							if(!(secarg2Node == null)){
								if(semHeadMatches(jcas, secarg2Node, triggerBegin, triggerEnd)){
									return true;								}
							}
						}
					}
				}
			}
		}
		return false;
	}


	private boolean DWArg2Arg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		String tString = currToken.getBase();
		if(tString.equals(ruleParts)){
			SyntacticAnnotation arg2Node = currToken.getArg2();
			if(!(arg2Node == null)){
				if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
					EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
					EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
					if(semHeadToken != null){
						String clueCandidate = semHeadToken.getBase().toLowerCase();
						if (ruleParts2.equals(clueCandidate)){
							SyntacticAnnotation secarg1Node = currToken.getArg1();
							if(!(secarg1Node == null)){
								if(semHeadMatches(jcas, secarg1Node, triggerBegin, triggerEnd)){
									return true;								}
							}
						}
					}
				}
			}
		}
		return false;
	}



	private boolean D1Arg2Arg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		SyntacticAnnotation arg2Node = currToken.getArg2();	
		if(!(arg2Node == null)){
			if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
				EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
				if(semHeadToken != null){
					boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
					if(!semHeadIsATrigger){
						String middleWordLemma = semHeadToken.getBase();
						if(middleWordLemma.toLowerCase().equals(ruleParts2.toLowerCase())){
							SyntacticAnnotation secondArg2Node = semHeadToken.getArg2();
							if(semHeadMatches(jcas, secondArg2Node, triggerBegin, triggerEnd)){
								return true;
							}
						}//if semHead is not a trigger
					}	
				}
			}
		}
		return false;
	}


	private boolean D1Arg1Arg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();


		SyntacticAnnotation arg1Node = currToken.getArg1();	
		if(!(arg1Node == null)){
			if(arg1Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent arg1NodeEC = (EnjuConstituent) arg1Node;
				EnjuToken semHeadToken = getSemHeadToken(arg1NodeEC, jcas);
				if(semHeadToken != null){
					boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
					if(!semHeadIsATrigger){
						String middleWordLemma = semHeadToken.getBase();
						if(middleWordLemma.toLowerCase().equals(ruleParts2.toLowerCase())){
							SyntacticAnnotation secondArg2Node = semHeadToken.getArg2();
							if(semHeadMatches(jcas, secondArg2Node, triggerBegin, triggerEnd)){
								return true;
							}
						}
					}//if semHead is not a trigger
				}	
			}
		}

		return false;
	}


	private boolean D1Arg2Arg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();
		SyntacticAnnotation arg2Node = currToken.getArg2();	
		if(!(arg2Node == null)){
			if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
				EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
				if(semHeadToken != null){
					boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
					if(!semHeadIsATrigger){
						String middleWordLemma = semHeadToken.getBase();
						if(middleWordLemma.toLowerCase().equals(ruleParts2.toLowerCase())){
							SyntacticAnnotation secondArg1Node = semHeadToken.getArg1();
							if(semHeadMatches(jcas, secondArg1Node, triggerBegin, triggerEnd)){
								return true;
							}
						}//if semHead is not a trigger
					}		
				}
			}
		}
		return false;
	}


	private boolean D1Arg1Arg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		SyntacticAnnotation arg1Node = currToken.getArg1();	
		if(!(arg1Node == null)){
			if(arg1Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent arg2NodeEC = (EnjuConstituent) arg1Node;
				EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
				if(semHeadToken != null){

					boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
					if(!semHeadIsATrigger){
						String middleWordLemma = semHeadToken.getBase();
						if(middleWordLemma.toLowerCase().equals(ruleParts2.toLowerCase())){
							SyntacticAnnotation secondArg1Node = semHeadToken.getArg1();
							if(semHeadMatches(jcas, secondArg1Node, triggerBegin, triggerEnd)){
								return true;
							}
						}
					}//if semHead is not a trigger
				}
			}		
		}
		return false;
	}


	private boolean D0Arg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken) {
		//System.out.println(currToken.getBase() + "-" + event.getId());
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		SyntacticAnnotation arg2Node = currToken.getArg2();	
		if(!(arg2Node == null)){
			if(semHeadMatches(jcas, arg2Node, triggerBegin, triggerEnd)){
				//System.out.println(currToken.getBase() + "-" + event.getId() + " TRUE");
				return true;
			}
		}

		return false;
	}


	private boolean D0Arg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken) {

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();
		SyntacticAnnotation arg1Node = currToken.getArg1();	
		if(!(arg1Node == null)){
			if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
				return true;
			}
		}

		return false;

	}


	//Helper Method: Follows the route of semantic head constituents and returns the final semantic head (EnjuToken) for the given EnjuConstituent
	private EnjuToken getSemHeadToken(EnjuConstituent ec, JCas jcas){
		EnjuToken semHeadToken = new EnjuToken(jcas);
		Annotation semHead = ec.getSemHead();
		if(semHead!=null){
			if(semHead.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuToken")){
				semHeadToken = (EnjuToken) semHead;
			}
			else{
				EnjuConstituent semHeadEC = (EnjuConstituent) semHead;
				semHeadToken = getSemHeadToken(semHeadEC, jcas);
			}
			return semHeadToken;
		}
		return null;

	}

	//Helper Method: Checks if a given token is a trigger
	private boolean isATrigger(EnjuToken token, FSIterator<Annotation> eventIterator){
		boolean result = false;
		while (eventIterator.hasNext()) {
			Event currEvent = (Event) eventIterator.next();
			int b1 = token.getBegin();
			int b2 = currEvent.getBegin();
			int e1 = token.getEnd();
			int e2 = currEvent.getEnd();
			if(b1==b2 && e1==e2){
				result = true;
				break;
			}
		}
		return result;
	}

	//Helper Method: Checks if the given node has a semantic head with given begin and end values
	private boolean semHeadMatches(JCas jcas, SyntacticAnnotation someNode, int begin, int end){
		boolean result = false;
		if(!(someNode == null)){
			if(someNode.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent modNodeEC = (EnjuConstituent) someNode;
				EnjuToken smeHeadToken = getSemHeadToken(modNodeEC, jcas);
				if(smeHeadToken == null){
					return false;
				}
				if((smeHeadToken.getBegin() <= begin) && (smeHeadToken.getEnd() >= end)){
					result = true;
				}
			}	
		}
		return result;
	}
}

