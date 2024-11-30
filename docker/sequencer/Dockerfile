FROM node:20
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY . /sequencer
WORKDIR /sequencer

RUN pnpm install --frozen-lockfile

EXPOSE 3333

CMD ["pnpm", "build-and-start:sequencer"]