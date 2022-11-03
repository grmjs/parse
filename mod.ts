import { Api } from "https://deno.land/x/grm@0.5.0/mod.ts";
import {
  EditMessageParams,
  SendMessageParams,
} from "https://deno.land/x/grm@0.5.0/src/client/types.ts";

const entities = {
  "MessageEntityBold": Api.MessageEntityBold,
  "MessageEntityCode": Api.MessageEntityCode,
  "MessageEntityItalic": Api.MessageEntityItalic,
  "MessageEntityTextUrl": Api.MessageEntityTextUrl,
  "MessageEntityPre": Api.MessageEntityPre,
  "MessageEntitySpoiler": Api.MessageEntitySpoiler,
  "MessageEntityStrike": Api.MessageEntityStrike,
  "MessageEntityUnderline": Api.MessageEntityUnderline,
};

export interface Stringable {
  toString(): string;
}

class FormattedString implements Stringable {
  text: string;
  entities: Api.TypeMessageEntity[];

  constructor(text: string, entities: Api.TypeMessageEntity[]) {
    this.text = text;
    this.entities = entities;
  }

  toString() {
    return this.text;
  }

  get send(): SendMessageParams {
    return {
      message: this.text,
      formattingEntities: this.entities,
    };
  }

  get edit(): Omit<EditMessageParams, "message"> {
    return {
      text: this.text,
      formattingEntities: this.entities,
    };
  }
}

const unwrap = (stringLike: Stringable): FormattedString => {
  if (stringLike instanceof FormattedString) {
    return stringLike;
  }
  return new FormattedString(stringLike.toString(), []);
};

// deno-lint-ignore no-explicit-any
const buildFormatter = <T extends Array<any> = never>(
  type: keyof typeof entities,
  ...formatArgKeys: T
) => {
  return (stringLike: Stringable, ...formatArgs: T) => {
    const formattedString = unwrap(stringLike);
    const formatArgObj = Object.fromEntries(
      formatArgKeys.map((formatArgKey, i) => [formatArgKey, formatArgs[i]]),
    );
    return new FormattedString(
      formattedString.text,
      [
        new entities[type]({
          offset: 0,
          length: formattedString.text.length,
          ...formatArgObj,
        }),
        ...formattedString.entities,
      ],
    );
  };
};

// Native entity functions
const bold = buildFormatter("MessageEntityBold");
const code = buildFormatter("MessageEntityCode");
const italic = buildFormatter("MessageEntityItalic");
const link = buildFormatter<[string]>("MessageEntityTextUrl", "url");
const pre = buildFormatter<[string]>("MessageEntityPre", "language");
const spoiler = buildFormatter("MessageEntitySpoiler");
const strikethrough = buildFormatter("MessageEntitySpoiler");
const underline = buildFormatter("MessageEntityUnderline");

// Utility functions
const mentionUser = (stringLike: Stringable, userId: number) => {
  return link(stringLike, `tg://user?id=${userId}`);
};

// Root format function
const fmt = (
  rawStringParts: TemplateStringsArray | string[],
  ...stringLikes: Stringable[]
): FormattedString => {
  let text = rawStringParts[0];
  const entities = new Array<Api.TypeMessageEntity>();

  for (let i = 0; i < stringLikes.length; i++) {
    const stringLike = stringLikes[i];
    if (stringLike instanceof FormattedString) {
      entities.push(
        ...stringLike.entities.map((e) => {
          e.offset += text.length;
          return e;
        }),
      );
    }
    text += stringLike.toString();
    text += rawStringParts[i + 1];
  }
  return new FormattedString(text, entities);
};

export {
  bold,
  code,
  fmt,
  FormattedString,
  italic,
  link,
  mentionUser,
  pre,
  spoiler,
  strikethrough,
  underline,
};
