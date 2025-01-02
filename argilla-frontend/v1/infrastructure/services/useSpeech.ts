import { ref } from "vue";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type Commands = "OpenDatasets";

const sanitizeCommand = {
  OpenDatasets: { trigger: "open data set" },
};

type Collector = (text: string) => void;

class Recognition {
  private readonly speaker: SpeechSynthesis;
  private readonly listener: any;
  private readonly collectors: ((text: string) => void)[] = [];

  private constructor() {
    this.speaker = window.speechSynthesis;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    this.listener = new SpeechRecognition();
    this.listener.continuous = true;
    this.listener.interimResults = false;
    this.listener.lang = "en-US";
    this.listener.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0];
      const sanitized = result.transcript.trim().toLowerCase();

      if (this.lastTranscript !== sanitized) {
        this.lastTranscript = sanitized;

        this.collectors.forEach((collect) => {
          collect(this.lastTranscript);
        });
      }
    };
  }

  speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    this.speaker.speak(utterance);

    console.log("Speaking: ", text);
  }

  private lastTranscript = "";
  listen(collect: Collector) {
    this.collectors.push(collect);

    if (this.collectors.length === 1) {
      this.startListening();
    }
  }

  ignore(collect: Collector) {
    this.collectors.splice(this.collectors.indexOf(collect), 1);

    if (this.collectors.length === 0) {
      this.stopListening();
    }
  }

  private startListening() {
    this.listener.start();
  }

  private stopListening() {
    this.listener.stop();
  }

  private static recognitionInstance: Recognition;
  static create() {
    if (!this.recognitionInstance) {
      this.recognitionInstance = new Recognition();
    }

    return this.recognitionInstance;
  }
}

export const useSpeech = () => {
  const recognition = Recognition.create();

  const textToSpeech = async (text: string) => {
    recognition.speak(text);
  };

  const speechCollect = (collect) => {
    recognition.listen(collect);
  };

  const explainCommands = () => {
    const currentCommands = Object.keys(sanitizeCommand).map(
      (key) => sanitizeCommand[key].trigger
    );

    recognition.speak(`This is our commands: ${currentCommands.join(", ")}`);
  };

  const waitCommands = (commands: Record<Commands, () => void>) => {
    recognition.listen((text: string) => {
      if (text === "what can i do") {
        explainCommands();
      }

      const command = Object.keys(commands).find((key) =>
        text.includes(sanitizeCommand[key])
      );

      if (command) {
        commands[command]();
      }
    });
  };

  return {
    textToSpeech,
    speechCollect,
    waitCommands,
    explainCommands,
  };
};
