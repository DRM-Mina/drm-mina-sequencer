FROM node:20

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /express

COPY package.json pnpm-lock.yaml ./

COPY local-packages/o1js/package.json local-packages/o1js/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 3333

CMD ["pnpm", "build-and-start:express"]