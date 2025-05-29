# Copyright (c) 2024, Michael Poli.

import argparse

import torch
import yaml

from vortex.model.generation import generate
from vortex.model.model import StripedHyena
from vortex.model.tokenizer import HFAutoTokenizer, CharLevelTokenizer
from vortex.model.utils import dotdict, print_rank_0, load_checkpoint

import logging


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run StripedHyena Model")
    parser.add_argument("--config_path", required=True, help="Path to configuration file")
    parser.add_argument("--checkpoint_path", default=None, help="Path to checkpoint file")
    parser.add_argument("--num_tokens", default=84, help="Number of tokens to generate.")
    parser.add_argument("--input_file", default="./prompt.txt", help="Path to prompt file.")
    parser.add_argument("--temperature", default=1, type=float)
    parser.add_argument("--repetition_penalty", default=1, type=float)
    parser.add_argument("--penalty_alpha", default=0, type=float)
    parser.add_argument("--top_k", default=8, type=int)
    parser.add_argument("--top_p", default=1, type=float)
    parser.add_argument(
        "--cached_generation",
        action="store_true",
        help="Use caching to speed up generation.",
    )
    parser.add_argument("--dry_run", action="store_true", help="Dry run the generation.")
    parser.add_argument("--debug", action="store_true", help="Debug mode.")

    torch.set_printoptions(precision=4, threshold=5)

    torch.manual_seed(1)
    torch.cuda.manual_seed(1)
    args = parser.parse_args()

    logging.getLogger().setLevel(logging.DEBUG if args.debug else logging.INFO)

    config = dotdict(yaml.load(open(args.config_path), Loader=yaml.FullLoader))

    if config.tokenizer_type == "CharLevelTokenizer":
        tokenizer = CharLevelTokenizer(config.vocab_size)
    else:
        tokenizer = HFAutoTokenizer(config.vocab_file)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    m = StripedHyena(config)

    if args.dry_run:
        args.checkpoint_path = None

    load_checkpoint(m, args.checkpoint_path)

    print_rank_0(f"Number of parameters: {sum(p.numel() for p in m.parameters())}")

    with open(args.input_file, "r") as f:
        input_string = f.read()
    print_rank_0(f"Prompt: {input_string}", end="\n\n")

    print_rank_0(
        generate(
            prompt_seqs=[input_string],
            n_tokens=args.num_tokens,
            model=m,
            tokenizer=tokenizer,
            top_k=args.top_k,
            top_p=args.top_p,
            temperature=args.temperature,
            verbose=2 if args.debug else 0,
            device=device,
        )
    )
