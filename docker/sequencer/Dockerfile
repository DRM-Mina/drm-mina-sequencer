FROM node:20

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /sequencer

COPY package.json pnpm-lock.yaml ./

COPY local-packages/o1js/package.json local-packages/o1js/

RUN pnpm install --frozen-lockfile

COPY . .

RUN cd local-packages/o1js && pnpm run prepublishOnly

RUN pnpm run build

EXPOSE 3333

CMD ["pnpm", "build-and-start:sequencer"]
